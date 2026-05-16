/**
 * Обёртка над Яндекс SDK.
 * Безопасные дефолты: если SDK не загрузился, методы тихо вырождаются.
 *
 * Документация: https://yandex.ru/dev/games/doc/dg/sdk/sdk-about.html
 */
(function (root) {
    "use strict";

    const LB_NAME = "best"; // имя лидерборда в консоли Яндекс.Игр
    const INTERSTITIAL_COOLDOWN_MS = 65_000; // SDK сам соблюдает >60с, но подстрахуемся

    const SDK = {
        ysdk: null,
        player: null,
        leaderboards: null,
        ready: false,
        env: null,
        lang: null,
        deviceType: "desktop", // 'desktop' | 'mobile' | 'tablet' | 'tv'
        _lastInterstitial: 0,
        _onAdvShow: null,
        _onAdvHide: null,

        async init() {
            if (typeof root.YaGames === "undefined") {
                return null;
            }
            try {
                this.ysdk = await root.YaGames.init();
                this.ready = true;
                this.env = this.ysdk.environment;
                this.lang =
                    (this.env && this.env.i18n && this.env.i18n.lang) || null;

                try {
                    this.deviceType = this.ysdk.deviceInfo.type || "desktop";
                } catch (_) {}

                try {
                    this.player = await this.ysdk.getPlayer({ scopes: false });
                } catch (_) {
                    this.player = null;
                }

                try {
                    this.leaderboards = await this.ysdk.getLeaderboards();
                } catch (_) {
                    this.leaderboards = null;
                }

                return this.ysdk;
            } catch (_) {
                this.ready = false;
                return null;
            }
        },

        /** true на мобильных и планшетах (по deviceInfo или pointer query) */
        isMobile() {
            if (this.ready) return this.deviceType === "mobile" || this.deviceType === "tablet";
            return root.matchMedia && root.matchMedia("(pointer: coarse)").matches;
        },

        /**
         * Уведомить SDK о завершении загрузки и о старте/остановке геймплея.
         */
        notifyLoaded() {
            try {
                this.ysdk &&
                    this.ysdk.features.LoadingAPI &&
                    this.ysdk.features.LoadingAPI.ready();
            } catch (_) {}
        },
        gameplayStart() {
            try {
                this.ysdk &&
                    this.ysdk.features.GameplayAPI &&
                    this.ysdk.features.GameplayAPI.start();
            } catch (_) {}
        },
        gameplayStop() {
            try {
                this.ysdk &&
                    this.ysdk.features.GameplayAPI &&
                    this.ysdk.features.GameplayAPI.stop();
            } catch (_) {}
        },

        setAdvHandlers(onShow, onHide) {
            this._onAdvShow = onShow;
            this._onAdvHide = onHide;
        },

        /**
         * Показывает баннерную рекламу (sticky, десктоп).
         */
        showBannerAdv() {
            try {
                this.ysdk && this.ysdk.adv && this.ysdk.adv.showBannerAdv();
            } catch (_) {}
        },

        /**
         * Скрывает баннерную рекламу (на время fullscreen/rewarded).
         */
        hideBannerAdv() {
            try {
                this.ysdk && this.ysdk.adv && this.ysdk.adv.hideBannerAdv();
            } catch (_) {}
        },

        /**
         * Показывает полноэкранную межуровневую рекламу.
         * Возвращает Promise<{shown:boolean, reason?:string}>.
         */
        showInterstitial() {
            return new Promise((resolve) => {
                if (!this.ready)
                    return resolve({ shown: false, reason: "no-sdk" });
                const now = Date.now();
                if (now - this._lastInterstitial < INTERSTITIAL_COOLDOWN_MS) {
                    return resolve({ shown: false, reason: "cooldown" });
                }
                let opened = false;
                try {
                    this.ysdk.adv.showFullscreenAdv({
                        callbacks: {
                            onOpen: () => {
                                opened = true;
                                this._lastInterstitial = Date.now();
                                this._onAdvShow && this._onAdvShow();
                            },
                            onClose: () => {
                                this._onAdvHide && this._onAdvHide();
                                resolve({ shown: opened });
                            },
                            onError: (err) => {
                                this._onAdvHide && this._onAdvHide();
                                resolve({ shown: false, reason: "error", err });
                            },
                        },
                    });
                } catch (e) {
                    resolve({ shown: false, reason: "exception" });
                }
            });
        },

        /**
         * Показывает rewarded-видео.
         * Resolve: { rewarded: boolean, reason: 'watched'|'declined'|'error'|'no-sdk' }
         */
        showRewarded() {
            return new Promise((resolve) => {
                if (!this.ready) return resolve({ rewarded: false, reason: 'no-sdk' });
                let rewarded = false;
                let opened = false;
                try {
                    this.ysdk.adv.showRewardedVideo({
                        callbacks: {
                            onOpen: () => { opened = true; this._onAdvShow && this._onAdvShow(); },
                            onRewarded: () => { rewarded = true; },
                            onClose: () => {
                                this._onAdvHide && this._onAdvHide();
                                resolve({ rewarded, reason: rewarded ? 'watched' : 'declined' });
                            },
                            onError: () => {
                                this._onAdvHide && this._onAdvHide();
                                resolve({ rewarded: false, reason: 'error' });
                            },
                        },
                    });
                } catch (_) {
                    resolve({ rewarded: false, reason: 'error' });
                }
            });
        },

        /**
         * Публикует рекорд. Тихо игнорирует, если лидерборд недоступен.
         */
        async submitScore(score) {
            if (!this.leaderboards || !score) return;
            try {
                await this.leaderboards.setLeaderboardScore(LB_NAME, score);
            } catch (_) {}
        },

        /**
         * Возвращает список из топ-N + позицию игрока.
         */
        async getLeaderboardEntries(top = 10) {
            if (!this.leaderboards) return null;
            try {
                return await this.leaderboards.getLeaderboardEntries(LB_NAME, {
                    quantityTop: top,
                    includeUser: true,
                    quantityAround: 0,
                });
            } catch (_) {
                return null;
            }
        },

        /**
         * Предложить пользователю добавить игру на рабочий стол (ярлык).
         * Вызывать не чаще одного раза за сессию, только после позитивного момента.
         */
        async showShortcutPrompt() {
            if (!this.ready || !this.ysdk.shortcut) return false;
            try {
                const { canShow } = await this.ysdk.shortcut.canShowPrompt();
                if (!canShow) return false;
                const { outcome } = await this.ysdk.shortcut.showPrompt();
                return outcome === "accepted";
            } catch (_) {
                return false;
            }
        },

        /**
         * Попросить пользователя оценить игру.
         * Вызывать только после явно положительного события (рекорд, победа).
         */
        async requestReview() {
            if (!this.ready || !this.ysdk.feedback) return false;
            try {
                const { value } = await this.ysdk.feedback.canReview();
                if (!value) return false;
                await this.ysdk.feedback.requestReview();
                return true;
            } catch (_) {
                return false;
            }
        },
    };

    root.SDK = SDK;
})(window);
