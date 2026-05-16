/**
 * Локализация: RU / EN.
 * Источник языка по приоритету: URL ?lang=, сохранённый выбор, Яндекс SDK, navigator.language.
 */
(function (root) {
    "use strict";

    const STRINGS = {
        ru: {
            title: "Тетрис",
            title_a: "Тет",
            title_b: "рис",
            tagline: "Классика, отполированная до зеркала.",
            play: "Играть",
            play_again: "Сыграть ещё",
            resume: "Продолжить",
            restart: "Заново",
            paused: "Пауза",
            game_over: "Игра окончена",
            score: "Счёт",
            best: "Лучший",
            lines: "Линии",
            level: "Уровень",
            hold: "Hold",
            next: "Очередь",
            leaderboard: "Таблица лидеров",
            revive: "Продолжить за рекламу",
            double_score: "Удвоить счёт (реклама)",
            tetris: "TETRIS",
            t_spin: "T-SPIN",
            t_spin_single: "T-SPIN ×1",
            t_spin_double: "T-SPIN ×2",
            t_spin_triple: "T-SPIN ×3",
            perfect_clear: "Чистая доска!",
            back_to_back: "B2B",
            combo: "Комбо ×",
            level_up: "Уровень {n}!",
            new_record: "Новый рекорд!",
            choose_level: "Выберите уровень",
            streak: "Серия: {n} дн.",
            time: "Время",
            pps: "Фигур/с",
            loading: "Загрузка…",
            close: "Закрыть",
            score_milestone: "{n} очков!",
            hint_desktop:
                "← → — движение · ↑ — поворот · ↓ — мягкое падение · Space — сброс · Shift/C — hold · P — пауза",
            hint_touch:
                "Свайп для движения · Тап — поворот · Свайп вниз — сброс · Долгий тап — hold",
            marathon: "Играть",
        levels: "Уровни",
        level_complete: "Уровень пройден!",
        next_level: "Следующий уровень",
        retry_level: "Ещё раз",
        to_menu: "В меню",
        back: "Назад",
        time_up: "Время вышло!",
        settings: "Настройки",
        theme_label: "Тема",
        theme_neon: "Неон",
        theme_minimal: "Минимал",
        theme_wood: "Дерево",
        theme_retro: "Ретро",
        sound_label: "Звук",
        language: "Язык",
        lb_unavailable: "Таблица лидеров доступна только в Яндекс.Играх.",
        ad_unavailable: "Реклама временно недоступна",
        retry: "Повторить",
        reset_settings: "Сбросить настройки",
        ctrl_label: "Управление",
        ctrl_gesture: "Жесты",
        ctrl_buttons: "Кнопки",
        },
        en: {
            title: "Tetris",
            title_a: "Tet",
            title_b: "ris",
            tagline: "A classic, polished to a mirror finish.",
            play: "Play",
            play_again: "Play again",
            resume: "Resume",
            restart: "Restart",
            paused: "Paused",
            game_over: "Game over",
            score: "Score",
            best: "Best",
            lines: "Lines",
            level: "Level",
            hold: "Hold",
            next: "Next",
            leaderboard: "Leaderboard",
            revive: "Revive (watch ad)",
            double_score: "Double score (ad)",
            tetris: "TETRIS",
            t_spin: "T-SPIN",
            t_spin_single: "T-SPIN ×1",
            t_spin_double: "T-SPIN ×2",
            t_spin_triple: "T-SPIN ×3",
            perfect_clear: "Perfect clear!",
            back_to_back: "B2B",
            combo: "Combo ×",
            level_up: "Level {n}!",
            new_record: "New record!",
            choose_level: "Choose level",
            streak: "Streak: {n}d",
            time: "Time",
            pps: "PPS",
            loading: "Loading…",
            close: "Close",
            score_milestone: "{n} pts!",
            hint_desktop:
                "← → move · ↑ rotate · ↓ soft drop · Space hard drop · Shift/C hold · P pause",
            hint_touch:
                "Swipe to move · Tap to rotate · Swipe down to drop · Long-press to hold",
            marathon: "Play",
            levels: "Levels",
            level_complete: "Level complete!",
            next_level: "Next level",
            retry_level: "Try again",
            to_menu: "Main menu",
            back: "Back",
            time_up: "Time's up!",
            settings: "Settings",
            theme_label: "Theme",
            theme_neon: "Neon",
            theme_minimal: "Minimal",
            theme_wood: "Wood",
            theme_retro: "Retro",
            sound_label: "Sound",
            language: "Language",
            lb_unavailable:
                "Leaderboard is available only inside Yandex Games.",
            ad_unavailable: "Ad temporarily unavailable",
            retry: "Retry",
            reset_settings: "Reset settings",
            ctrl_label: "Controls",
            ctrl_gesture: "Gestures",
            ctrl_buttons: "Buttons",
        },
    };

    const SUPPORTED = Object.keys(STRINGS);
    const STORAGE_KEY = "tetris.lang";

    const I18N = {
        current: "ru",
        listeners: new Set(),

        detect(sdkLang) {
            const params = new URLSearchParams(location.search);
            const fromUrl = params.get("lang");
            const fromStore = (() => {
                try {
                    return localStorage.getItem(STORAGE_KEY);
                } catch (_) {
                    return null;
                }
            })();
            const fromNav = (navigator.language || "ru")
                .slice(0, 2)
                .toLowerCase();
            const candidate = (
                fromUrl ||
                fromStore ||
                sdkLang ||
                fromNav ||
                "ru"
            ).toLowerCase();
            return SUPPORTED.includes(candidate) ? candidate : "ru";
        },

        init(sdkLang) {
            this.current = this.detect(sdkLang);
            document.documentElement.lang = this.current;
            this.apply();
        },

        set(lang) {
            if (!SUPPORTED.includes(lang)) return;
            this.current = lang;
            document.documentElement.lang = lang;
            try {
                localStorage.setItem(STORAGE_KEY, lang);
            } catch (_) {}
            this.apply();
            this.listeners.forEach((fn) => fn(lang));
        },

        cycle() {
            const idx = SUPPORTED.indexOf(this.current);
            this.set(SUPPORTED[(idx + 1) % SUPPORTED.length]);
        },

        t(key, params) {
            const dict = STRINGS[this.current] || STRINGS.ru;
            let s = dict[key] || STRINGS.ru[key] || key;
            if (params) {
                Object.keys(params).forEach((k) => {
                    s = s.replace(`{${k}}`, params[k]);
                });
            }
            return s;
        },

        apply() {
            document.querySelectorAll("[data-i18n]").forEach((el) => {
                const key = el.getAttribute("data-i18n");
                el.textContent = this.t(key);
            });
            const langLabel = document.getElementById("langLabel");
            if (langLabel) langLabel.textContent = this.current.toUpperCase();
        },

        onChange(fn) {
            this.listeners.add(fn);
            return () => this.listeners.delete(fn);
        },
    };

    root.I18N = I18N;
})(window);
