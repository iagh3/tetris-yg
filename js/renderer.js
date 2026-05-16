/**
 * Canvas-рендер. Hi-DPI, аккуратные блоки с подсветкой граней (без неонового свечения).
 *
 * Три полотна:
 *   - boardCanvas: игровое поле + активная фигура + ghost + анимация очистки линий.
 *   - holdCanvas:   hold-фигура.
 *   - nextCanvas:   очередь из 5 следующих.
 */
(function (root) {
    "use strict";

    const C = root.TetrisConst;
    const COLS = C.COLS;
    const ROWS = C.ROWS;
    const VANISH = C.VANISH_ROWS;
    const SHAPES = C.SHAPES;
    const COLORS = C.COLORS;

    // Theme-aware color cache
    const _THEME_COLORS = {
        // Neon / Cyberpunk — electric glow palette
        neon:    { I:"#00e5ff", O:"#ffe040", T:"#e040fb", S:"#00e676", Z:"#ff4081", J:"#2979ff", L:"#ff9100" },
        // Minimal / Material — Tailwind 400-level: bright, distinct, designed for dark UI
        minimal: { I:"#38bdf8", O:"#fbbf24", T:"#c084fc", S:"#4ade80", Z:"#f87171", J:"#818cf8", L:"#fb923c" },
        // Wood / Natural — warm earth tones only: honey, pumpkin, mahogany, olive, terracotta
        wood:    { I:"#f0c040", O:"#e07820", T:"#a04828", S:"#78a838", Z:"#c83820", J:"#b86830", L:"#d89028" },
        // Retro / PICO-8 — pixel arcade palette: black screen, candy-bright pieces
        retro:   { I:"#29adff", O:"#ffec27", T:"#ff77a8", S:"#00e436", Z:"#ff004d", J:"#83769c", L:"#ffa300" },
    };
    let _colorMemo = {};
    let _colorMemoTheme = null;

    function _getTheme() { return document.documentElement.dataset.theme || 'neon'; }

    function _themedColor(hexOrType) {
        const theme = _getTheme();
        if (theme !== _colorMemoTheme) { _colorMemo = {}; _colorMemoTheme = theme; }
        if (_colorMemo[hexOrType]) return _colorMemo[hexOrType];
        const map = _THEME_COLORS[theme] || _THEME_COLORS.neon;
        // If it's a type key (I, O, T…)
        if (map[hexOrType]) return (_colorMemo[hexOrType] = map[hexOrType]);
        // Reverse-lookup by original hex
        const type = Object.keys(COLORS).find(t => COLORS[t] === hexOrType);
        const result = type ? (map[type] || hexOrType) : hexOrType;
        return (_colorMemo[hexOrType] = result);
    }

    function _boardBg() {
        const t = _getTheme();
        if (t === 'minimal') return '#1a1d2a';
        if (t === 'wood')    return '#160a00';
        if (t === 'retro')   return '#0d0d1a';
        return '#0c0e1a'; // neon
    }
    function _gridLine() {
        const t = _getTheme();
        if (t === 'neon')    return 'rgba(0, 229, 255, 0.04)';
        if (t === 'wood')    return 'rgba(200, 120, 40, 0.07)';
        if (t === 'retro')   return 'rgba(41, 173, 255, 0.07)';
        return 'rgba(255, 255, 255, 0.03)'; // minimal
    }

    function darken(hex, k = 0.65) {
        const c = parseInt(hex.slice(1), 16);
        const r = Math.max(0, Math.floor(((c >> 16) & 0xff) * k));
        const g = Math.max(0, Math.floor(((c >> 8) & 0xff) * k));
        const b = Math.max(0, Math.floor((c & 0xff) * k));
        return `rgb(${r},${g},${b})`;
    }
    function lighten(hex, k = 0.25) {
        const c = parseInt(hex.slice(1), 16);
        const r = Math.min(255, Math.floor(((c >> 16) & 0xff) + 255 * k));
        const g = Math.min(255, Math.floor(((c >> 8) & 0xff) + 255 * k));
        const b = Math.min(255, Math.floor((c & 0xff) + 255 * k));
        return `rgb(${r},${g},${b})`;
    }

    class Renderer {
        constructor(game, opts) {
            this.game = game;
            this.boardCanvas = opts.boardCanvas;
            this.holdCanvas = opts.holdCanvas;
            this.nextCanvas = opts.nextCanvas;
            this.playfield = opts.playfield;

            this.bctx = this.boardCanvas.getContext("2d");
            this.hctx = this.holdCanvas.getContext("2d");
            this.nctx = this.nextCanvas.getContext("2d");

            this.cell = 24;
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);

            this.clearAnim = null; // { rows, t, dur }

            this.resize();
            let _resizeTimer = 0;
            window.addEventListener("resize", () => {
                clearTimeout(_resizeTimer);
                _resizeTimer = setTimeout(() => this.resize(), 100);
            });

            game.on("lock", (data) => {
                if (data.cleared && data.cleared.length) {
                    this.clearAnim = {
                        rows: data.cleared.slice(),
                        t: 0,
                        dur: 220,
                    };
                }
            });
        }

        resize() {
            const host = this.playfield;
            const aspect = COLS / ROWS;
            const maxW = host.clientWidth;
            const maxH = host.clientHeight;
            let w = maxH * aspect;
            let h = maxH;
            if (w > maxW) {
                w = maxW;
                h = maxW / aspect;
            }

            this.cell = Math.floor(w / COLS);
            w = this.cell * COLS;
            h = this.cell * ROWS;

            this._configureCanvas(this.boardCanvas, this.bctx, w, h);

            // мини-канвасы — следим за CSS-размером.
            this._configureMini(this.holdCanvas, this.hctx);
            this._configureMini(this.nextCanvas, this.nctx);
        }

        _configureCanvas(canvas, ctx, cssW, cssH) {
            canvas.style.width = cssW + "px";
            canvas.style.height = cssH + "px";
            canvas.width = Math.round(cssW * this.dpr);
            canvas.height = Math.round(cssH * this.dpr);
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        _configureMini(canvas, ctx) {
            const cssW = canvas.clientWidth;
            const cssH = canvas.clientHeight;
            canvas.width = Math.round(cssW * this.dpr);
            canvas.height = Math.round(cssH * this.dpr);
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        // ===== Главный рендер =====
        render(dtMs = 16) {
            this._drawBoard(dtMs);
            this._drawHold();
            this._drawNext();
        }

        _drawBoard(dtMs) {
            const ctx = this.bctx;
            const cell = this.cell;
            const w = COLS * cell;
            const h = ROWS * cell;

            ctx.fillStyle = _boardBg();
            ctx.fillRect(0, 0, w, h);

            // мягкая сетка
            ctx.strokeStyle = _gridLine();
            ctx.lineWidth = 1;
            for (let x = 1; x < COLS; x++) {
                ctx.beginPath();
                ctx.moveTo(x * cell + 0.5, 0);
                ctx.lineTo(x * cell + 0.5, h);
                ctx.stroke();
            }
            for (let y = 1; y < ROWS; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * cell + 0.5);
                ctx.lineTo(w, y * cell + 0.5);
                ctx.stroke();
            }

            // зафиксированные блоки (учитываем зону vanish)
            for (let y = VANISH; y < VANISH + ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const c = this.game.grid[y][x];
                    if (c) this._block(ctx, x, y - VANISH, _themedColor(c), 1);
                }
            }

            // анимация мерцания очищенных строк
            if (this.clearAnim) {
                this.clearAnim.t += dtMs;
                const k = this.clearAnim.t / this.clearAnim.dur;
                if (k >= 1) {
                    this.clearAnim = null;
                } else {
                    const alpha = 1 - k;
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.55})`;
                    this.clearAnim.rows.forEach((absY) => {
                        const y = absY - VANISH;
                        if (y >= 0 && y < ROWS) {
                            ctx.fillRect(0, y * cell, w, cell);
                        }
                    });
                }
            }

            // активная фигура и ghost
            const a = this.game.active;
            if (a && this.game.state !== "over") {
                const gy = this.game.ghostY();
                this._drawPieceAt(ctx, a, a.x, gy, 0.18, true);
                this._drawPieceAt(ctx, a, a.x, a.y, 1, false);
            }
        }

        _drawPieceAt(ctx, piece, px, py, alpha, ghost) {
            for (let y = 0; y < piece.matrix.length; y++) {
                for (let x = 0; x < piece.matrix[y].length; x++) {
                    if (!piece.matrix[y][x]) continue;
                    const drawY = py + y - VANISH;
                    if (drawY < 0 || drawY >= ROWS) continue;
                    this._block(ctx, px + x, drawY, _themedColor(piece.color), alpha, ghost);
                }
            }
        }

        _block(ctx, gx, gy, color, alpha = 1, ghost = false) {
            const cell = this.cell;
            const x = gx * cell;
            const y = gy * cell;
            const pad = Math.max(1, Math.round(cell * 0.06));

            ctx.globalAlpha = alpha;

            // Neon glow only
            if (!ghost && _getTheme() === 'neon') {
                ctx.shadowColor = color;
                ctx.shadowBlur = 8;
            }

            if (ghost) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(
                    x + pad,
                    y + pad,
                    cell - pad * 2,
                    cell - pad * 2,
                );
                ctx.globalAlpha = 1;
                return;
            }

            // основное тело
            ctx.fillStyle = color;
            ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);

            // верхняя светлая грань
            ctx.fillStyle = lighten(color, 0.22);
            ctx.fillRect(
                x + pad,
                y + pad,
                cell - pad * 2,
                Math.max(2, Math.round(cell * 0.18)),
            );

            // нижняя тёмная грань
            ctx.fillStyle = darken(color, 0.6);
            ctx.fillRect(
                x + pad,
                y + cell - pad - Math.max(2, Math.round(cell * 0.16)),
                cell - pad * 2,
                Math.max(2, Math.round(cell * 0.16)),
            );

            // тонкий контур
            ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
            ctx.lineWidth = 1;
            ctx.strokeRect(
                x + pad + 0.5,
                y + pad + 0.5,
                cell - pad * 2 - 1,
                cell - pad * 2 - 1,
            );

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }

        // ===== Мини-канвасы =====
        _drawHold() {
            const ctx = this.hctx;
            const w = this.holdCanvas.clientWidth;
            const h = this.holdCanvas.clientHeight;
            ctx.clearRect(0, 0, w, h);
            const type = this.game.hold;
            if (!type) return;
            const allowed = !this.game.holdUsed;
            this._drawMiniPiece(ctx, type, w, h, allowed ? 1 : 0.35);
        }

        _drawNext() {
            const ctx = this.nctx;
            const w = this.nextCanvas.clientWidth;
            const h = this.nextCanvas.clientHeight;
            ctx.clearRect(0, 0, w, h);
            const queue = this.game.previewNext(5);
            const slotH = h / queue.length;
            queue.forEach((type, i) => {
                this._drawMiniPiece(ctx, type, w, slotH, 1, i * slotH);
            });
        }

        _drawMiniPiece(ctx, type, w, h, alpha = 1, yOffset = 0) {
            const matrix = SHAPES[type];
            const n = matrix.length;
            // тримируем матрицу до bbox
            let minX = n,
                minY = n,
                maxX = -1,
                maxY = -1;
            for (let y = 0; y < n; y++) {
                for (let x = 0; x < n; x++) {
                    if (matrix[y][x]) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            const bw = maxX - minX + 1;
            const bh = maxY - minY + 1;
            const cell = Math.floor(Math.min(w / 5, h / 4));
            const drawW = bw * cell;
            const drawH = bh * cell;
            const ox = Math.floor((w - drawW) / 2);
            const oy = Math.floor((h - drawH) / 2) + yOffset;
            const color = _themedColor(type);
            const pad = Math.max(1, Math.round(cell * 0.06));
            ctx.globalAlpha = alpha;
            for (let y = 0; y < n; y++) {
                for (let x = 0; x < n; x++) {
                    if (!matrix[y][x]) continue;
                    const px = ox + (x - minX) * cell;
                    const py = oy + (y - minY) * cell;
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        px + pad,
                        py + pad,
                        cell - pad * 2,
                        cell - pad * 2,
                    );
                    ctx.fillStyle = lighten(color, 0.22);
                    ctx.fillRect(
                        px + pad,
                        py + pad,
                        cell - pad * 2,
                        Math.max(2, Math.round(cell * 0.18)),
                    );
                    ctx.fillStyle = darken(color, 0.6);
                    ctx.fillRect(
                        px + pad,
                        py + cell - pad - Math.max(2, Math.round(cell * 0.16)),
                        cell - pad * 2,
                        Math.max(2, Math.round(cell * 0.16)),
                    );
                    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(
                        px + pad + 0.5,
                        py + pad + 0.5,
                        cell - pad * 2 - 1,
                        cell - pad * 2 - 1,
                    );
                }
            }
            ctx.globalAlpha = 1;
        }
    }

    root.Renderer = Renderer;
})(window);
