/**
 * Ядро игры Тетрис.
 *
 * Что реализовано:
 *  - 7-bag randomizer (равномерная выдача 7 фигур в случайном порядке).
 *  - SRS rotation system с wall-kicks для J/L/S/T/Z и отдельной таблицей для I.
 *  - Hold-фигура (нельзя удерживать дважды подряд).
 *  - Очередь Next из 5 фигур.
 *  - Lock delay 500 мс с ограничением 15 ресетов на фигуру (как в гайдлайнах).
 *  - Soft / hard drop с бонусом очков.
 *  - Гравитация по формуле Tetris Guideline: (0.8 - (level-1) * 0.007) ^ (level-1).
 *  - Очистка линий с очками: 100/300/500/800 × level, B2B-бонус 1.5×, комбо.
 *  - Распознавание T-spin (3-corner rule) и mini T-spin.
 *  - Perfect Clear bonus.
 *  - Корректная обработка топ-аута (block-out / lock-out).
 *
 * Класс не работает с DOM — он отдаёт состояние и события, рендер занимается отдельный модуль.
 */
(function (root) {
    "use strict";

    const COLS = 10;
    const ROWS = 20;
    const VANISH_ROWS = 2; // невидимая зона над полем (для спавна)
    const TOTAL_ROWS = ROWS + VANISH_ROWS;

    const LOCK_DELAY_MS = 500;
    const MAX_LOCK_RESETS = 15;

    // Цвета фигур — приглушённая «человеческая» палитра.
    const COLORS = {
        I: "#5BC0EB",
        O: "#E6B450",
        T: "#A78BFA",
        S: "#7FB069",
        Z: "#E07A5F",
        J: "#5C80BC",
        L: "#F2994A",
    };

    // Стартовые матрицы фигур (4×4 для I/O, 3×3 для остальных).
    // Используется SRS: матрицы вращаются на месте, центр известен.
    const SHAPES = {
        I: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ],
        O: [
            [1, 1],
            [1, 1],
        ],
        T: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0],
        ],
        S: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0],
        ],
        Z: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0],
        ],
        J: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0],
        ],
        L: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0],
        ],
    };

    // SRS wall-kicks. Индекс [from][to] -> массив сдвигов (x,y) в координатах поля.
    // Ось Y растёт вниз, в стандарте SRS — вверх; знаки скорректированы.
    const KICKS_JLSTZ = {
        "0-1": [
            [0, 0],
            [-1, 0],
            [-1, -1],
            [0, 2],
            [-1, 2],
        ],
        "1-0": [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, -2],
            [1, -2],
        ],
        "1-2": [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, -2],
            [1, -2],
        ],
        "2-1": [
            [0, 0],
            [-1, 0],
            [-1, -1],
            [0, 2],
            [-1, 2],
        ],
        "2-3": [
            [0, 0],
            [1, 0],
            [1, -1],
            [0, 2],
            [1, 2],
        ],
        "3-2": [
            [0, 0],
            [-1, 0],
            [-1, 1],
            [0, -2],
            [-1, -2],
        ],
        "3-0": [
            [0, 0],
            [-1, 0],
            [-1, 1],
            [0, -2],
            [-1, -2],
        ],
        "0-3": [
            [0, 0],
            [1, 0],
            [1, -1],
            [0, 2],
            [1, 2],
        ],
    };
    const KICKS_I = {
        "0-1": [
            [0, 0],
            [-2, 0],
            [1, 0],
            [-2, 1],
            [1, -2],
        ],
        "1-0": [
            [0, 0],
            [2, 0],
            [-1, 0],
            [2, -1],
            [-1, 2],
        ],
        "1-2": [
            [0, 0],
            [-1, 0],
            [2, 0],
            [-1, -2],
            [2, 1],
        ],
        "2-1": [
            [0, 0],
            [1, 0],
            [-2, 0],
            [1, 2],
            [-2, -1],
        ],
        "2-3": [
            [0, 0],
            [2, 0],
            [-1, 0],
            [2, -1],
            [-1, 2],
        ],
        "3-2": [
            [0, 0],
            [-2, 0],
            [1, 0],
            [-2, 1],
            [1, -2],
        ],
        "3-0": [
            [0, 0],
            [1, 0],
            [-2, 0],
            [1, 2],
            [-2, -1],
        ],
        "0-3": [
            [0, 0],
            [-1, 0],
            [2, 0],
            [-1, -2],
            [2, 1],
        ],
    };

    // Очки за очистку линий по гайдлайну.
    const LINE_SCORES = [0, 100, 300, 500, 800];
    const T_SPIN_SCORES = {
        mini: [100, 200, 400],
        full: [400, 800, 1200, 1600],
    };

    const TYPES = ["I", "J", "L", "O", "S", "T", "Z"];

    function cloneMatrix(m) {
        return m.map((row) => row.slice());
    }

    function rotateCW(m) {
        const n = m.length;
        const r = Array.from({ length: n }, () => new Array(n).fill(0));
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                r[x][n - 1 - y] = m[y][x];
            }
        }
        return r;
    }

    function rotateCCW(m) {
        const n = m.length;
        const r = Array.from({ length: n }, () => new Array(n).fill(0));
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                r[n - 1 - x][y] = m[y][x];
            }
        }
        return r;
    }

    class Bag {
        constructor() {
            this.queue = [];
            this._refill();
            this._refill();
        }
        _refill() {
            const t = TYPES.slice();
            for (let i = t.length - 1; i > 0; i--) {
                const j = (Math.random() * (i + 1)) | 0;
                [t[i], t[j]] = [t[j], t[i]];
            }
            this.queue.push(...t);
        }
        next() {
            if (this.queue.length < 7) this._refill();
            return this.queue.shift();
        }
        peek(n = 5) {
            while (this.queue.length < n) this._refill();
            return this.queue.slice(0, n);
        }
    }

    class Tetris {
        constructor() {
            this.cols = COLS;
            this.rows = ROWS;
            this.vanishRows = VANISH_ROWS;
            this.totalRows = TOTAL_ROWS;

            this.grid = this._emptyGrid();
            this.bag = new Bag();

            this.active = null; // активная фигура
            this.hold = null; // тип фигуры в hold
            this.holdUsed = false; // флаг "hold уже использовался в этой жизни фигуры"

            this.score = 0;
            this.lines = 0;
            this.level = 1;
            this.combo = -1;
            this.backToBack = false; // флаг b2b после tetris или t-spin
            this.startLevel = 1;

            this.gravityTimer = 0; // мс с последнего падения
            this.lockTimer = 0; // мс на полу до фиксации
            this.lockResets = 0;
            this.onGround = false;

            this.softDropping = false;
            this.softDropDistance = 0;

            this.state = "idle"; // idle | running | paused | over
            this.lastClear = null; // описание последнего очищения (для рендера/тостов)

            this.listeners = {};
        }

        // ===== События =====
        on(event, fn) {
            (this.listeners[event] || (this.listeners[event] = [])).push(fn);
        }
        emit(event, data) {
            const arr = this.listeners[event];
            if (!arr) return;
            for (const fn of arr) fn(data);
        }

        // ===== Жизненный цикл =====
        start(startLevel = 1) {
            this.grid = this._emptyGrid();
            this.score = 0;
            this.lines = 0;
            this.startLevel = Math.max(1, Math.min(20, startLevel | 0));
            this.level = this.startLevel;
            this.combo = -1;
            this.backToBack = false;
            this.holdUsed = false;
            this.hold = null;
            this.bag = new Bag();
            this.gravityTimer = 0;
            this.lockTimer = 0;
            this.lockResets = 0;
            this.softDropping = false;
            this.softDropDistance = 0;
            this.lastClear = null;
            this.state = "running";
            this._spawn();
            this.emit("stateChanged");
        }

        pause() {
            if (this.state !== "running") return;
            this.state = "paused";
            this.emit("stateChanged");
        }
        resume() {
            if (this.state !== "paused") return;
            this.state = "running";
            this.emit("stateChanged");
        }
        // Public revive: clear top visible rows and spawn new piece after game over.
        revive() {
            if (this.state !== "over") return false;
            for (let i = 0; i < 4; i++) {
                this.grid[this.vanishRows + i] = new Array(this.cols).fill(null);
            }
            this.state = "running";
            this._spawn();
            this.emit("stateChanged");
            return true;
        }
        gameOver(reason) {
            this.state = "over";
            this.emit("gameOver", {
                score: this.score,
                lines: this.lines,
                level: this.level,
                reason,
            });
            this.emit("stateChanged");
        }

        _emptyGrid() {
            return Array.from({ length: TOTAL_ROWS }, () =>
                new Array(COLS).fill(null),
            );
        }

        // ===== Игровой цикл =====
        update(dtMs) {
            if (this.state !== "running" || !this.active) return;
            const gravity = this._gravityMs();
            const interval = this.softDropping
                ? Math.min(gravity, 50)
                : gravity;
            this.gravityTimer += dtMs;

            if (this.gravityTimer >= interval) {
                this.gravityTimer = 0;
                this._stepDown();
            }

            if (this.onGround) {
                this.lockTimer += dtMs;
                if (this.lockTimer >= LOCK_DELAY_MS) {
                    this._lock();
                }
            }
        }

        _gravityMs() {
            // Tetris Guideline: time = (0.8 - (level-1) * 0.007) ^ (level-1) секунд
            const l = Math.max(1, this.level);
            const base = Math.max(0.07, 0.8 - (l - 1) * 0.007);
            return Math.max(20, Math.pow(base, l - 1) * 1000);
        }

        _stepDown() {
            const a = this.active;
            const moved = this._tryMove(0, 1);
            if (!moved) {
                this.onGround = true;
            } else {
                this.onGround = false;
                this.lockTimer = 0;
                if (this.softDropping) {
                    this.score += 1;
                    this.softDropDistance += 1;
                    this.emit("scoreChanged");
                }
            }
        }

        // ===== Спавн =====
        _spawn(type) {
            const t = type || this.bag.next();
            const matrix = cloneMatrix(SHAPES[t]);
            const piece = {
                type: t,
                color: COLORS[t],
                matrix,
                rotation: 0,
                x: t === "O" ? 4 : 3,
                y: t === "I" ? VANISH_ROWS - 2 : VANISH_ROWS - 2,
                lastAction: null,
            };
            this.active = piece;
            this.holdUsed = false;
            this.gravityTimer = 0;
            this.lockTimer = 0;
            this.lockResets = 0;
            this.onGround = this._collides(this.active, 0, 1);

            // Block out: новая фигура сразу пересекается с полем.
            if (this._collides(this.active, 0, 0)) {
                this.active = null;
                this.gameOver("block-out");
                return;
            }
            this.emit("pieceSpawned", piece);
        }

        // ===== Движение =====
        moveLeft() {
            return this._move(-1, 0);
        }
        moveRight() {
            return this._move(1, 0);
        }
        softDropOn() {
            this.softDropping = true;
        }
        softDropOff() {
            this.softDropping = false;
        }

        _move(dx, dy) {
            if (this.state !== "running" || !this.active) return false;
            const ok = this._tryMove(dx, dy);
            if (ok) {
                this.active.lastAction = "move";
                this._afterMoveOrRotate();
            }
            return ok;
        }

        _tryMove(dx, dy) {
            if (!this.active) return false;
            if (this._collides(this.active, dx, dy)) return false;
            this.active.x += dx;
            this.active.y += dy;
            return true;
        }

        _afterMoveOrRotate() {
            // Lock delay reset при движении/повороте над поверхностью.
            const grounded = this._collides(this.active, 0, 1);
            if (grounded) {
                this.onGround = true;
                if (this.lockResets < MAX_LOCK_RESETS) {
                    this.lockTimer = 0;
                    this.lockResets += 1;
                }
            } else {
                this.onGround = false;
                this.lockTimer = 0;
            }
        }

        // ===== Поворот с SRS-кикaми =====
        rotate(dir) {
            if (this.state !== "running" || !this.active) return false;
            const a = this.active;
            if (a.type === "O") return false; // O не поворачивается

            const from = a.rotation;
            const to = (from + (dir > 0 ? 1 : 3)) % 4;
            const next = dir > 0 ? rotateCW(a.matrix) : rotateCCW(a.matrix);

            const table = a.type === "I" ? KICKS_I : KICKS_JLSTZ;
            const kicks = table[`${from}-${to}`] || [[0, 0]];

            for (let i = 0; i < kicks.length; i++) {
                const [kx, ky] = kicks[i];
                if (!this._collidesMatrix(next, a.x + kx, a.y - ky)) {
                    a.matrix = next;
                    a.rotation = to;
                    a.x += kx;
                    a.y -= ky;
                    a.lastAction = "rotate";
                    a.lastKickIndex = i;
                    this._afterMoveOrRotate();
                    return true;
                }
            }
            return false;
        }

        // ===== Hold =====
        doHold() {
            if (this.state !== "running" || !this.active || this.holdUsed)
                return false;
            const cur = this.active.type;
            this.active = null;
            if (this.hold) {
                const swap = this.hold;
                this.hold = cur;
                this._spawn(swap);
            } else {
                this.hold = cur;
                this._spawn();
            }
            this.holdUsed = true;
            this.emit("holdChanged", this.hold);
            return true;
        }

        // ===== Hard drop =====
        hardDrop() {
            if (this.state !== "running" || !this.active) return 0;
            let dist = 0;
            while (this._tryMove(0, 1)) dist++;
            if (dist > 0) {
                this.score += dist * 2;
                this.emit("scoreChanged");
            }
            this.active.lastAction = dist > 0 ? "drop" : this.active.lastAction;
            this._lock();
            return dist;
        }

        // ===== Фиксация и очистка =====
        _lock() {
            const a = this.active;
            if (!a) return;

            // Lock-out: фигура полностью выше видимого поля.
            let anyVisible = false;
            for (let y = 0; y < a.matrix.length; y++) {
                for (let x = 0; x < a.matrix[y].length; x++) {
                    if (a.matrix[y][x]) {
                        const gy = a.y + y;
                        const gx = a.x + x;
                        if (
                            gy >= 0 &&
                            gy < TOTAL_ROWS &&
                            gx >= 0 &&
                            gx < COLS
                        ) {
                            this.grid[gy][gx] = a.color;
                            if (gy >= VANISH_ROWS) anyVisible = true;
                        }
                    }
                }
            }

            const tSpin = this._detectTSpin(a);

            const cleared = this._clearLines();
            const clearedRows = cleared.rows;
            const n = clearedRows.length;
            const perfect = this._isPerfectClear();

            // Очки.
            let gained = 0;
            let label = null;
            const lvl = this.level;

            if (tSpin.kind === "full") {
                gained = (T_SPIN_SCORES.full[n] || 0) * lvl;
                if (n === 1) label = "t_spin_single";
                else if (n === 2) label = "t_spin_double";
                else if (n === 3) label = "t_spin_triple";
                else label = "t_spin";
            } else if (tSpin.kind === "mini") {
                gained = (T_SPIN_SCORES.mini[n] || 0) * lvl;
                label = "t_spin";
            } else {
                gained = LINE_SCORES[n] * lvl;
                if (n === 4) label = "tetris";
            }

            // Back-to-back.
            const difficult = n === 4 || (tSpin.kind !== "none" && n > 0);
            const wasB2B = this.backToBack;
            if (n > 0) {
                if (difficult) {
                    if (wasB2B) gained = Math.floor(gained * 1.5);
                    this.backToBack = true;
                } else {
                    this.backToBack = false;
                }
            }

            // Combo.
            if (n > 0) {
                this.combo += 1;
                if (this.combo > 0) gained += 50 * this.combo * lvl;
            } else {
                this.combo = -1;
            }

            // Perfect clear bonus.
            if (perfect && n > 0) {
                const pcBonus = [0, 800, 1200, 1800, 2000][n] * lvl;
                gained += pcBonus;
            }

            this.score += gained;
            this.lines += n;
            const oldLevel = this.level;
            this.level = Math.max(
                this.startLevel,
                Math.floor(this.lines / 10) + this.startLevel,
            );

            this.lastClear = {
                count: n,
                tSpin: tSpin.kind,
                perfect: perfect && n > 0,
                b2b: difficult && wasB2B && n > 0,
                combo: this.combo > 0 ? this.combo : 0,
                label,
                gained,
            };

            this.emit("lock", {
                piece: a,
                cleared: clearedRows,
                tSpin,
                anyVisible,
            });
            if (n > 0) this.emit("linesCleared", this.lastClear);
            if (this.level !== oldLevel) this.emit("levelUp", this.level);
            this.emit("scoreChanged");

            // Lock-out: ничего не оказалось в видимой зоне.
            if (!anyVisible) {
                this.active = null;
                this.gameOver("lock-out");
                return;
            }

            this.active = null;
            this._spawn();
        }

        _clearLines() {
            const cleared = [];
            for (let y = TOTAL_ROWS - 1; y >= 0; y--) {
                if (this.grid[y].every((c) => c !== null)) {
                    cleared.push(y);
                }
            }
            // Удаляем сверху вниз, чтобы индексы остались валидными.
            cleared
                .slice()
                .sort((a, b) => b - a)
                .forEach((y) => {
                    this.grid.splice(y, 1);
                    this.grid.unshift(new Array(COLS).fill(null));
                });
            return { rows: cleared };
        }

        _isPerfectClear() {
            for (let y = 0; y < TOTAL_ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    if (this.grid[y][x] !== null) return false;
                }
            }
            return true;
        }

        _detectTSpin(piece) {
            if (piece.type !== "T" || piece.lastAction !== "rotate")
                return { kind: "none" };
            const cx = piece.x + 1;
            const cy = piece.y + 1;

            // Четыре угла T в локальной системе.
            const corners = [
                [cx - 1, cy - 1], // TL
                [cx + 1, cy - 1], // TR
                [cx - 1, cy + 1], // BL
                [cx + 1, cy + 1], // BR
            ];
            const occupied = corners.map(([x, y]) => {
                if (x < 0 || x >= COLS || y < 0 || y >= TOTAL_ROWS) return true;
                return this.grid[y][x] !== null;
            });
            const occCount = occupied.filter(Boolean).length;
            if (occCount < 3) return { kind: "none" };

            // Front-corners — те два, к которым "смотрит" T.
            const frontIdx = (() => {
                switch (piece.rotation) {
                    case 0:
                        return [0, 1]; // TL, TR
                    case 1:
                        return [1, 3]; // TR, BR
                    case 2:
                        return [2, 3]; // BL, BR
                    case 3:
                        return [0, 2]; // TL, BL
                }
            })();
            const frontFilled = frontIdx.filter((i) => occupied[i]).length;

            if (frontFilled === 2) return { kind: "full" };

            // Mini T-spin: если последний kick был [-1,-2] (5-й вариант, индекс 4), считается полным.
            if (piece.lastKickIndex === 4) return { kind: "full" };
            return { kind: "mini" };
        }

        // ===== Коллизии =====
        _collides(piece, dx, dy) {
            return this._collidesMatrix(
                piece.matrix,
                piece.x + dx,
                piece.y + dy,
            );
        }

        _collidesMatrix(matrix, px, py) {
            for (let y = 0; y < matrix.length; y++) {
                for (let x = 0; x < matrix[y].length; x++) {
                    if (!matrix[y][x]) continue;
                    const gx = px + x;
                    const gy = py + y;
                    if (gx < 0 || gx >= COLS || gy >= TOTAL_ROWS) return true;
                    if (gy >= 0 && this.grid[gy][gx] !== null) return true;
                }
            }
            return false;
        }

        // ===== Призрак =====
        ghostY() {
            if (!this.active) return 0;
            let dy = 0;
            while (
                !this._collidesMatrix(
                    this.active.matrix,
                    this.active.x,
                    this.active.y + dy + 1,
                )
            ) {
                dy++;
            }
            return this.active.y + dy;
        }

        // ===== Очередь =====
        previewNext(n = 5) {
            return this.bag.peek(n);
        }
    }

    root.Tetris = Tetris;
    root.TetrisConst = { COLS, ROWS, VANISH_ROWS, TOTAL_ROWS, COLORS, SHAPES };
})(window);
