/**
 * Хранилище прогресса.
 * Облачное сохранение через Яндекс SDK (если доступно) + локальный fallback.
 * Слияние при загрузке: числа — Math.max, кампания — по звёздам, серия — по дате.
 */
(function (root) {
    "use strict";

    const LOCAL_KEY = "tetris.save.v1";
    const KEYS = ["best", "totalLines", "totalGames", "maxCombo", "maxLevel", "campaignJson", "streakJson"];

    const def = () => ({
        best: 0,
        totalLines: 0,
        totalGames: 0,
        maxCombo: 0,
        maxLevel: 0,
        campaignJson: "{}",
        streakJson: "{}",
    });

    const readLocal = () => {
        try {
            const raw = localStorage.getItem(LOCAL_KEY);
            if (!raw) return def();
            return Object.assign(def(), JSON.parse(raw));
        } catch (_) {
            return def();
        }
    };

    const writeLocal = (data) => {
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
        } catch (_) {}
    };

    const merge = (a, b) => {
        const out = def();

        // Числовые поля — берём максимум
        ["best", "totalLines", "totalGames", "maxCombo", "maxLevel"].forEach((k) => {
            out[k] = Math.max(Number(a[k]) || 0, Number(b[k]) || 0);
        });

        // Кампания — сливаем по максимуму звёзд и очков на уровень
        try {
            const ca = JSON.parse(a.campaignJson || "{}");
            const cb = JSON.parse(b.campaignJson || "{}");
            const cm = {};
            new Set([...Object.keys(ca), ...Object.keys(cb)]).forEach((k) => {
                if (k === "_unlocked") {
                    cm[k] = Math.max(Number(ca[k]) || 1, Number(cb[k]) || 1);
                } else {
                    const va = ca[k] || { stars: 0, score: 0 };
                    const vb = cb[k] || { stars: 0, score: 0 };
                    cm[k] = {
                        stars: Math.max(va.stars || 0, vb.stars || 0),
                        score: Math.max(va.score || 0, vb.score || 0),
                    };
                }
            });
            out.campaignJson = JSON.stringify(cm);
        } catch (_) {}

        // Серия дней — берём более свежую дату
        try {
            const sa = JSON.parse(a.streakJson || "{}");
            const sb = JSON.parse(b.streakJson || "{}");
            out.streakJson = JSON.stringify((sa.date || "") >= (sb.date || "") ? sa : sb);
        } catch (_) {}

        return out;
    };

    const Storage = {
        data: def(),
        _sdk: null,
        _player: null,
        _writeTimer: 0,
        _pending: null,

        async init(sdk) {
            this._sdk = sdk;
            this.data = readLocal();

            if (sdk && sdk.player) {
                this._player = sdk.player;
                try {
                    const cloud = await sdk.player.getData(KEYS);
                    if (cloud && typeof cloud === "object") {
                        this.data = merge(this.data, cloud);
                        writeLocal(this.data);
                    }
                } catch (_) {
                    /* нет доступа — играем локально */
                }
            }
            return this.data;
        },

        get(key) {
            const v = this.data[key];
            return v !== undefined ? v : 0;
        },

        set(patch) {
            Object.assign(this.data, patch);
            writeLocal(this.data);
            this._queueCloud();
        },

        _queueCloud() {
            if (!this._player) return;
            clearTimeout(this._writeTimer);
            this._writeTimer = setTimeout(() => {
                try {
                    this._player.setData(this.data, false);
                } catch (_) {}
            }, 600);
        },
    };

    root.Storage = Storage;
})(window);
