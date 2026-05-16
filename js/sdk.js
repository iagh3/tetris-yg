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
        _lastAdClosed: 0,   // timestamp of last ad close — enforces gap before next rewarded
        _onAdvShow: null,
        _onAdvHide: null,
        _adActive: false,   // true while any fullscreen/rewarded ad is open

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
         * Таймаут 8 с — защита от зависания, если SDK не вызовет колбэк.
         */
        showInterstitial() {
            return new Promise((resolve) => {
                if (!this.ready)
                    return resolve({ shown: false, reason: "no-sdk" });
                const now = Date.now();
                if (now - this._lastInterstitial < INTERSTITIAL_COOLDOWN_MS) {
                    return resolve({ shown: false, reason: "cooldown" });
                }
                let settled = false;
                let advOpened = false;
                let loadTimer = null;
                let safetyTimer = null;
                const settle = (val) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(loadTimer);
                    clearTimeout(safetyTimer);
                    if (advOpened) {
                        // Record close time so waitForAdSlot enforces the 2 s gap.
                        // Resolve immediately so buttons appear as soon as the ad closes.
                        // Short grace keeps _adActive true if the user clicks too fast.
                        this._lastAdClosed = Date.now();
                        setTimeout(() => { this._adActive = false; }, 500);
                    } else {
                        this._adActive = false;
                    }
                    resolve(val);
                };
                // Pre-mark the ad slot as busy BEFORE the call so that showRewarded
                // waits even if Revive is clicked before onOpen fires.
                this._adActive = true;
                loadTimer = setTimeout(() => {
                    if (!advOpened) settle({ shown: false, reason: "timeout" });
                }, 8000);
                try {
                    this.ysdk.adv.showFullscreenAdv({
                        callbacks: {
                            onOpen: () => {
                                advOpened = true;
                                this._lastInterstitial = Date.now();
                                this._onAdvShow && this._onAdvShow();
                                safetyTimer = setTimeout(() => {
                                    this._onAdvHide && this._onAdvHide();
                                    settle({ shown: true, reason: "safety-timeout" });
                                }, 300000);
                            },
                            onClose: () => {
                                if (advOpened) this._onAdvHide && this._onAdvHide();
                                settle({ shown: advOpened });
                            },
                            onError: (err) => {
                                if (advOpened) this._onAdvHide && this._onAdvHide();
                                settle({ shown: false, reason: "error", err });
                            },
                        },
                    });
                } catch (e) {
                    settle({ shown: false, reason: "exception" });
                }
            });
        },

        /**
         * Показывает rewarded-видео.
         * Resolve: { rewarded: boolean, reason: 'watched'|'declined'|'error'|'no-sdk'|'timeout' }
         */
        showRewarded() {
            return new Promise((resolve) => {
                if (!this.ready) return resolve({ rewarded: false, reason: 'no-sdk' });

                // Wait until the SDK's internal ad lock is released.
                // Two conditions must both be true:
                //   1. _adActive is false (no ad currently open)
                //   2. at least 2 s have passed since the last ad closed
                // This prevents "Another ad already opened" regardless of how quickly
                // the user clicks a rewarded-video button after an interstitial.
                const MIN_GAP_MS = 2000;
                const waitForAdSlot = (cb) => {
                    const ready = () =>
                        !this._adActive && (Date.now() - this._lastAdClosed) >= MIN_GAP_MS;
                    if (ready()) { cb(); return; }
                    let waited = 0;
                    const poll = setInterval(() => {
                        waited += 100;
                        if (ready() || waited >= 12000) {
                            clearInterval(poll);
                            cb();
                        }
                    }, 100);
                };

                waitForAdSlot(() => {
                    let settled = false;
                    let rewarded = false;
                    let advOpened = false;
                    let loadTimer = null;
                    let safetyTimer = null;
                    const settle = (val) => {
                        if (settled) return;
                        settled = true;
                        clearTimeout(loadTimer);
                        clearTimeout(safetyTimer);
                        if (advOpened) this._lastAdClosed = Date.now();
                        this._adActive = false;
                        // Small delay so onRewarded fires before resolve if SDK sends it after onClose
                        setTimeout(() => resolve(val), 200);
                    };

                    const callbacks = {
                        onOpen: () => {
                            if (settled) return; // stale callback after a retry resolved early
                            advOpened = true;
                            this._adActive = true;
                            this._onAdvShow && this._onAdvShow();
                            safetyTimer = setTimeout(() => {
                                if (advOpened) this._onAdvHide && this._onAdvHide();
                                settle({ rewarded: false, reason: 'timeout' });
                            }, 240000);
                        },
                        onRewarded: () => { rewarded = true; },
                        onClose: () => {
                            if (advOpened) this._onAdvHide && this._onAdvHide();
                            settle({ rewarded, reason: rewarded ? 'watched' : 'declined' });
                        },
                        onError: () => {
                            if (advOpened) this._onAdvHide && this._onAdvHide();
                            settle({ rewarded: false, reason: 'error' });
                        },
                    };

                    // Retry on "already opened": the SDK releases its internal ad lock
                    // asynchronously after onClose, so we may need a few attempts.
                    const tryShow = (attempt) => {
                        if (settled) return; // promise already resolved, don't call SDK again
                        try {
                            this.ysdk.adv.showRewardedVideo({ callbacks });
                            // SDK accepted the call — start the "never opened" watchdog.
                            loadTimer = setTimeout(() => {
                                if (!advOpened) settle({ rewarded: false, reason: 'timeout' });
                            }, 8000);
                        } catch (e) {
                            const conflict = e && typeof e.message === 'string' &&
                                e.message.toLowerCase().includes('already opened');
                            if (conflict && attempt < 6) {
                                setTimeout(() => tryShow(attempt + 1), 700);
                            } else {
                                settle({ rewarded: false, reason: 'error' });
                            }
                        }
                    };
                    tryShow(0);
                });
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
