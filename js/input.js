/**
 * Ввод: клавиатура с DAS/ARR + жесты / кнопки для сенсорных устройств.
 *
 * DAS 133мс, ARR 17мс — стандарт гайдлайна (8/1 кадра @ 60fps).
 *
 * Режим управления (InputPrefs.setControlMode):
 *   gesture — жесты и тапы на поле (touchpad скрыт)
 *   buttons — кнопочная панель внизу
 *
 * Жесты (gesture mode):
 *   Тап (левые 45% ширины поля)  → поворот CCW
 *   Тап (правые 55% ширины поля) → поворот CW
 *   Свайп влево/вправо           → движение (шаг = ~0.65 ячейки; DAS при удержании)
 *   Долгое нажатие 350 мс        → hold
 *   Быстрый свайп вниз           → hard drop  (скорость ≥ 0.4 px/мс, смещение ≥ 20px)
 *   Медленный/удержанный свайп ↓ → soft drop  (пока палец удерживается)
 *   Свайп вверх                  → hard drop  (скорость ≥ 0.4 px/мс, смещение ≥ 35px)
 *   Два пальца                   → пауза
 */
(function (root) {
    "use strict";

    // DAS/ARR — guideline standard (8 frames / 1 frame @ 60 fps)
    const DAS = 133;
    const ARR = 17;

    const PREFS_KEY = "tetris.input.v1";

    const InputPrefs = {
        current: _loadPrefs(),

        setControlMode(mode) {
            this.current.controlMode = mode;
            _savePrefs(this.current);
        },
    };

    function _loadPrefs() {
        try {
            const raw = localStorage.getItem(PREFS_KEY);
            if (raw) {
                const p = JSON.parse(raw);
                if (p && typeof p.controlMode === "string") return p;
            }
        } catch (_) {}
        return { controlMode: "gesture" };
    }

    function _savePrefs(p) {
        try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (_) {}
    }

    // ===== Константы жестов =====
    const GES_COMMIT_PX    = 10;   // мин. смещение для фиксации направления
    const GES_H_RATIO      = 1.4;  // |dx|/|dy| → горизонтальный жест
    const GES_V_RATIO      = 1.2;  // |dy|/|dx| → вертикальный жест
    const GES_HARD_VEL     = 0.40; // мин. скорость (px/мс) для hard drop
    const GES_HARD_DY_DOWN = 20;   // мин. смещение вниз (px) для hard drop
    const GES_HARD_DY_UP   = 35;   // мин. смещение вверх (px) для hard drop ↑
    const GES_LONGPRESS_MS = 350;  // длина долгого нажатия (hold)
    const GES_TAP_MAX_PX   = 12;   // макс. смещение для tap
    const GES_TAP_MAX_MS   = 250;  // макс. длительность tap
    const GES_STEP_RATIO   = 0.65; // шаг горизонтального жеста = N * ширина_ячейки

    class Input {
        constructor(game, opts) {
            this.game          = game;
            this.audio         = opts.audio         || null;
            this.playfield     = opts.playfield;
            this.touchpad      = opts.touchpad;
            this.onPauseToggle = opts.onPauseToggle  || (() => {});
            this.onUnlock      = opts.onUnlock        || (() => {});

            // Клавиатурный DAS
            this.keys      = {};
            this._dasDir   = 0;
            this._dasTimer = 0;
            this._arrTimer = 0;
            this._dasWall  = false; // true при ARR=0, когда фигура у стенки

            // Жестовый DAS
            this._gDasDir   = 0;
            this._gDasTimer = 0;
            this._gArrTimer = 0;

            this._softDragging = false;
            this._unlocked     = false;

            this._bindKeyboard();
            this._bindTouchButtons();
            this._bindGestures();
            this.applyControlMode();
        }

        get _prefs() { return InputPrefs.current; }

        // ===== Применение режима управления =====
        applyControlMode() {
            if (!this.touchpad) return;
            const isTouch = root.SDK ? root.SDK.isMobile()
                                     : window.matchMedia("(pointer: coarse)").matches;
            if (!isTouch) { this.touchpad.style.display = ""; return; }
            const mode = this._prefs.controlMode || "gesture";
            // Inline style перебивает CSS-медиа
            this.touchpad.style.display = mode === "buttons" ? "grid" : "none";
        }

        // ===== Клавиатура =====
        _bindKeyboard() {
            window.addEventListener("keydown", (e) => {
                this._unlock();
                const code = e.code;
                if (this.keys[code]) {
                    if (["ArrowLeft","ArrowRight","ArrowDown","ArrowUp","Space"]
                            .includes(code)) e.preventDefault();
                    return;
                }
                this.keys[code] = true;

                switch (code) {
                    case "ArrowLeft":
                        e.preventDefault();
                        this.dispatch("left");
                        this._startDas(-1);
                        break;
                    case "ArrowRight":
                        e.preventDefault();
                        this.dispatch("right");
                        this._startDas(1);
                        break;
                    case "ArrowUp":
                    case "KeyX":
                        e.preventDefault(); this.dispatch("rotateCW");  break;
                    case "KeyZ":
                    case "ControlLeft":
                    case "ControlRight":
                        e.preventDefault(); this.dispatch("rotateCCW"); break;
                    case "ArrowDown":
                        e.preventDefault(); this.dispatch("softDropOn"); break;
                    case "Space":
                        e.preventDefault(); this.dispatch("hardDrop");   break;
                    case "ShiftLeft":
                    case "ShiftRight":
                    case "KeyC":
                        e.preventDefault(); this.dispatch("hold");       break;
                    case "KeyP":
                    case "Escape":
                        e.preventDefault(); this.onPauseToggle();        break;
                }
            }, { passive: false });

            window.addEventListener("keyup", (e) => {
                const code = e.code;
                this.keys[code] = false;
                if (code === "ArrowLeft"  && this._dasDir === -1) this._stopDas();
                if (code === "ArrowRight" && this._dasDir ===  1) this._stopDas();
                if (code === "ArrowDown") this.dispatch("softDropOff");
            });

            window.addEventListener("blur", () => {
                this.keys = {};
                this._stopDas();
                this.game.softDropOff();
            });
        }

        _startDas(dir) {
            this._dasDir   = dir;
            this._dasTimer = 0;
            this._arrTimer = 0;
            this._dasWall  = false;
        }
        _stopDas() {
            this._dasDir   = 0;
            this._dasWall  = false;
        }

        // ===== DAS / ARR — вызывается из игрового цикла каждый кадр =====
        update(dtMs) {
            // --- Клавиатурный DAS ---
            if (this._dasDir !== 0 && !this._dasWall) {
                this._dasTimer += dtMs;
                if (this._dasTimer >= DAS) {
                    this._arrTimer += dtMs;
                    while (this._arrTimer >= ARR) {
                        this._arrTimer -= ARR;
                        if (!this._moveOne(this._dasDir)) {
                            this._dasWall = true;
                            break;
                        }
                    }
                }
            }

            // --- Жестовый DAS (удержание после горизонтального свайпа) ---
            if (this._gDasDir !== 0) {
                this._gDasTimer += dtMs;
                if (this._gDasTimer >= DAS) {
                    this._gArrTimer += dtMs;
                    while (this._gArrTimer >= ARR) {
                        this._gArrTimer -= ARR;
                        if (!this._moveOne(this._gDasDir)) {
                            this._gDasDir = 0;
                            break;
                        }
                    }
                }
            }
        }

        // Двигает фигуру на 1 шаг; возвращает true если удалось
        _moveOne(dir) {
            const g = this.game;
            if (g.state !== "running") return false;
            const ok = dir < 0 ? g.moveLeft() : g.moveRight();
            if (ok) this.audio && this.audio.move();
            return ok;
        }

        // ===== Сенсорные кнопки (buttons mode) =====
        _bindTouchButtons() {
            if (!this.touchpad) return;
            const buttons = this.touchpad.querySelectorAll("[data-act]");
            buttons.forEach((btn) => {
                const act = btn.getAttribute("data-act");
                let dasTimer    = null;
                let arrInterval = null;

                const press = (e) => {
                    e.preventDefault();
                    this._unlock();
                    if (act === "softDrop") { this.game.softDropOn(); return; }
                    this.dispatch(act);
                    if (act === "left" || act === "right") {
                        clearTimeout(dasTimer); clearInterval(arrInterval);
                        dasTimer = setTimeout(() => {
                            arrInterval = setInterval(
                                () => this.dispatch(act),
                                ARR
                            );
                        }, DAS);
                    }
                };
                const release = () => {
                    if (act === "softDrop") this.game.softDropOff();
                    clearTimeout(dasTimer); clearInterval(arrInterval);
                    dasTimer = arrInterval = null;
                };

                btn.addEventListener("pointerdown",  press,   { passive: false });
                btn.addEventListener("pointerup",     release, { passive: true  });
                btn.addEventListener("pointercancel", release, { passive: true  });
                btn.addEventListener("pointerleave",  release, { passive: true  });
                btn.addEventListener("contextmenu", (e) => e.preventDefault());
            });
        }

        // ===== Жестовый движок =====
        _bindGestures() {
            if (!this.playfield) return;
            const el = this.playfield;

            // Состояние жеста (замыкание)
            let gState = "idle"; // idle | press | drag_h | drag_v | longpress
            let T      = null;   // данные касания
            let lpTimer = null;

            const resetGesture = () => {
                gState = "idle";
                T = null;
                this._gDasDir   = 0;
                this._gDasTimer = 0;
                this._gArrTimer = 0;
                if (this._softDragging) {
                    this._softDragging = false;
                    this.game.softDropOff();
                }
                if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
            };

            // Два пальца → пауза
            el.addEventListener("touchstart", (e) => {
                if (e.touches.length >= 2) { this.onPauseToggle(); resetGesture(); }
            }, { passive: true });

            el.addEventListener("pointerdown", (e) => {
                if (e.pointerType === "mouse") return;
                if (gState !== "idle") return;
                if ((this._prefs.controlMode || "gesture") === "buttons") return;
                this._unlock();

                const rect = el.getBoundingClientRect();
                const now  = Date.now();
                gState = "press";
                T = {
                    startX:  e.clientX,  startY:  e.clientY,
                    startTime: now,
                    lastX:   e.clientX,  lastY:   e.clientY,  lastTime: now,
                    relX:    (e.clientX - rect.left) / rect.width, // 0..1
                    cellW:   rect.width / 10,
                    velY:    0,
                };
                el.setPointerCapture(e.pointerId);

                lpTimer = setTimeout(() => {
                    if (gState === "press") {
                        gState = "longpress";
                        this.dispatch("hold");
                    }
                    lpTimer = null;
                }, GES_LONGPRESS_MS);
            }, { passive: false });

            el.addEventListener("pointermove", (e) => {
                if (e.pointerType === "mouse") return;
                if (!T || gState === "idle" || gState === "longpress") return;

                const now  = Date.now();
                const dtMs = Math.max(1, now - T.lastTime);
                const dx   = e.clientX - T.startX;
                const dy   = e.clientY - T.startY;
                const dxL  = e.clientX - T.lastX;
                const dyL  = e.clientY - T.lastY;
                T.velY   = dyL / dtMs;  // px/мс, + вниз
                T.lastX  = e.clientX; T.lastY  = e.clientY; T.lastTime = now;

                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);

                if (gState === "press") {
                    // Отмена долгого нажатия при движении
                    if ((absDx > GES_TAP_MAX_PX || absDy > GES_TAP_MAX_PX) && lpTimer) {
                        clearTimeout(lpTimer); lpTimer = null;
                    }
                    // Фиксация горизонтального жеста
                    if (absDx >= GES_COMMIT_PX && absDx >= absDy * GES_H_RATIO) {
                        gState = "drag_h";
                        const dir = dx > 0 ? 1 : -1;
                        this._moveOne(dir);
                        T.lastX   = T.startX + dir * GES_COMMIT_PX;
                        this._gDasDir   = dir;
                        this._gDasTimer = 0;
                        this._gArrTimer = 0;
                    }
                    // Фиксация вертикального жеста (только вниз)
                    else if (dy >= GES_COMMIT_PX && absDy >= absDx * GES_V_RATIO) {
                        gState = "drag_v";
                        this._softDragging = true;
                        this.game.softDropOn();
                    }
                }

                if (gState === "drag_h") {
                    // Шаговое движение по ячейкам
                    const stepPx = Math.max(8, T.cellW * GES_STEP_RATIO);
                    while (Math.abs(e.clientX - T.lastX) >= stepPx) {
                        const dir = e.clientX > T.lastX ? 1 : -1;
                        this._moveOne(dir);
                        T.lastX += dir * stepPx;
                        // Смена направления — сбросить жестовый DAS
                        if (dir !== this._gDasDir) {
                            this._gDasDir   = dir;
                            this._gDasTimer = 0;
                            this._gArrTimer = 0;
                        }
                    }
                }
            }, { passive: true });

            el.addEventListener("pointerup", (e) => {
                if (e.pointerType === "mouse") return;
                if (!T) return;
                const dt    = Date.now() - T.startTime;
                const totDx = e.clientX - T.startX;
                const totDy = e.clientY - T.startY;
                const velY  = T.velY;
                const saved = { gState, relX: T.relX };
                resetGesture();

                if (saved.gState === "longpress") return;

                // Hard drop — быстрый свайп вниз
                if (velY >= GES_HARD_VEL && totDy >= GES_HARD_DY_DOWN &&
                        (saved.gState === "press" || saved.gState === "drag_v")) {
                    this.dispatch("hardDrop"); return;
                }
                // Hard drop — быстрый свайп вверх
                if (velY <= -GES_HARD_VEL && -totDy >= GES_HARD_DY_UP) {
                    this.dispatch("hardDrop"); return;
                }

                // Tap → поворот (левая 45% = CCW, правая 55% = CW)
                if (saved.gState === "press" && dt < GES_TAP_MAX_MS &&
                        Math.abs(totDx) < GES_TAP_MAX_PX &&
                        Math.abs(totDy) < GES_TAP_MAX_PX) {
                    this.dispatch(saved.relX < 0.45 ? "rotateCCW" : "rotateCW");
                }
            }, { passive: true });

            el.addEventListener("pointercancel", (e) => {
                if (e.pointerType === "mouse") return;
                resetGesture();
            }, { passive: true });

            el.addEventListener("contextmenu", (e) => e.preventDefault());
        }

        // ===== Универсальная отправка действия =====
        dispatch(action) {
            const g = this.game;
            if (g.state !== "running") return;
            switch (action) {
                case "left":
                    if (g.moveLeft())  this.audio && this.audio.move();   break;
                case "right":
                    if (g.moveRight()) this.audio && this.audio.move();   break;
                case "rotateCW":
                    if (g.rotate(1))   this.audio && this.audio.rotate(); break;
                case "rotateCCW":
                    if (g.rotate(-1))  this.audio && this.audio.rotate(); break;
                case "softDropOn":
                    g.softDropOn();   break;
                case "softDropOff":
                    g.softDropOff();  break;
                case "softDrop":
                    g.softDropOn();   break;
                case "hardDrop":
                    g.hardDrop();
                    this.audio && this.audio.hardDrop(); break;
                case "hold":
                    if (g.doHold()) this.audio && this.audio.hold(); break;
            }
        }

        _unlock() {
            if (this._unlocked) return;
            this._unlocked = true;
            this.onUnlock();
        }
    }

    root.Input      = Input;
    root.InputPrefs = InputPrefs;
})(window);
