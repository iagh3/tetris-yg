/**
 * Block Blast engine — place pieces on an 8×8 grid, clear full rows and columns.
 * Uses a dedicated RAF loop so rendering never blocks on input events.
 */
(function (root) {
    "use strict";

    const W = 8, H = 8;

    const COLORS = [
        null,
        '#00e5ff', // 1 cyan
        '#ffe040', // 2 yellow
        '#e040fb', // 3 purple
        '#2979ff', // 4 blue
        '#ff6d00', // 5 orange
        '#69f0ae', // 6 green
        '#ff4081', // 7 red
    ];

    // Pieces: cells=[row,col][] normalised to min-0 origin, c=color index
    const PIECES = [
        { cells:[[0,0]],                                        c:4 }, // 1-cell
        { cells:[[0,0],[0,1]],                                  c:6 }, // 1×2 H
        { cells:[[0,0],[1,0]],                                  c:6 }, // 2×1 V
        { cells:[[0,0],[0,1],[0,2]],                            c:1 }, // 1×3 H
        { cells:[[0,0],[1,0],[2,0]],                            c:1 }, // 3×1 V
        { cells:[[0,0],[0,1],[1,0]],                            c:5 }, // corner ↖
        { cells:[[0,0],[0,1],[1,1]],                            c:5 }, // corner ↗
        { cells:[[0,0],[1,0],[1,1]],                            c:5 }, // corner ↙
        { cells:[[0,1],[1,0],[1,1]],                            c:5 }, // corner ↘
        { cells:[[0,0],[0,1],[1,0],[1,1]],                      c:2 }, // 2×2
        { cells:[[0,0],[0,1],[0,2],[0,3]],                      c:1 }, // 1×4 H
        { cells:[[0,0],[1,0],[2,0],[3,0]],                      c:1 }, // 4×1 V
        { cells:[[0,0],[1,0],[2,0],[2,1]],                      c:5 }, // L
        { cells:[[0,1],[1,1],[2,0],[2,1]],                      c:7 }, // J
        { cells:[[0,0],[0,1],[0,2],[1,0]],                      c:5 }, // L flat
        { cells:[[0,0],[0,1],[0,2],[1,2]],                      c:7 }, // J flat
        { cells:[[0,0],[0,1],[0,2],[0,3],[0,4]],                c:1 }, // 1×5 H
        { cells:[[0,0],[1,0],[2,0],[3,0],[4,0]],                c:1 }, // 5×1 V
        { cells:[[0,0],[0,1],[1,0],[1,1],[2,0]],                c:2 }, // 2×3 block
        { cells:[[0,0],[0,1],[0,2],[1,0],[1,1]],                c:2 }, // 3×2 block
        { cells:[[0,1],[1,0],[1,1],[1,2],[2,1]],                c:3 }, // plus
        { cells:[[0,0],[0,1],[0,2],[1,1]],                      c:3 }, // T-up
        { cells:[[0,0],[1,0],[1,1],[2,0]],                      c:3 }, // T-right
        { cells:[[0,0],[0,1],[1,1],[1,2]],                      c:7 }, // Z
        { cells:[[0,1],[0,2],[1,0],[1,1]],                      c:4 }, // S
    ];

    // Smaller pieces appear more often
    const WEIGHTS = PIECES.map(p => Math.max(1, 7 - p.cells.length));
    const WTOTAL  = WEIGHTS.reduce((a, b) => a + b, 0);

    function pickRandom() {
        let r = Math.random() * WTOTAL;
        for (let i = 0; i < PIECES.length; i++) { r -= WEIGHTS[i]; if (r <= 0) return i; }
        return 0;
    }

    function pieceBounds(piece) {
        let r0=99, r1=-99, c0=99, c1=-99;
        for (const [r, c] of piece.cells) {
            r0=Math.min(r0,r); r1=Math.max(r1,r);
            c0=Math.min(c0,c); c1=Math.max(c1,c);
        }
        return { r0, r1, c0, c1, rows: r1-r0+1, cols: c1-c0+1 };
    }

    const BlastGame = {
        // Game state
        board:  null,
        tray:   [null, null, null],
        score:  0,
        combo:  0,
        over:   false,
        _anim:  null,   // { cells:Set<int>, frame, total }

        // Rendering
        _canvas:  null,
        _ctx:     null,
        _trayC:   [],
        _cs:      40,   // cell size px
        _field:   null, // container div

        // RAF loop
        _rafId:   0,
        _dirty:   false,
        _trayDirty: false,

        // Input state
        _sel:       -1,   // selected tray slot
        _gr:        -1,   // ghost row
        _gc:        -1,   // ghost col
        _dragging:  false,

        _listeners: {},

        // ── Public API ──────────────────────────────────────────────────────

        init(canvas, trayCanvases, fieldEl) {
            this._canvas = canvas;
            this._ctx    = canvas.getContext('2d');
            this._trayC  = trayCanvases;
            this._field  = fieldEl;
            this._bindInput();
            this._startLoop();
        },

        start() {
            this._listeners  = {};
            this.board  = Array.from({ length: H }, () => new Array(W).fill(0));
            this.tray   = [null, null, null];
            this.score  = 0;
            this.combo  = 0;
            this.over   = false;
            this._anim  = null;
            this._sel   = -1;
            this._gr    = -1;
            this._gc    = -1;
            this._dragging = false;
            this._resize();
            for (let i = 0; i < 3; i++) this.tray[i] = pickRandom();
            this._dirty     = true;
            this._trayDirty = true;
        },

        resize() {
            this._resize();
            this._dirty     = true;
            this._trayDirty = true;
        },

        on(ev, cb) {
            if (!this._listeners[ev]) this._listeners[ev] = [];
            this._listeners[ev].push(cb);
        },

        // ── Internal ────────────────────────────────────────────────────────

        _emit(ev, d) {
            (this._listeners[ev] || []).forEach(cb => cb(d));
        },

        _startLoop() {
            const tick = () => {
                this._rafId = requestAnimationFrame(tick);
                if (this._trayDirty) { this._renderTray(); this._trayDirty = false; }
                if (this._dirty || this._anim) { this._doRender(); this._dirty = false; }
            };
            this._rafId = requestAnimationFrame(tick);
        },

        _resize() {
            if (!this._field || this._field.offsetHeight < 10) return;
            const maxW = this._field.offsetWidth  - 4;
            const maxH = this._field.offsetHeight - 4;
            const cs = Math.max(26, Math.min(Math.floor(maxW / W), Math.floor(maxH / H), 60));
            this._cs = cs;
            this._canvas.width  = cs * W;
            this._canvas.height = cs * H;
        },

        // Convert screen coords → board cell index
        _cellAt(clientX, clientY) {
            const rect   = this._canvas.getBoundingClientRect();
            const scaleX = this._canvas.width  / rect.width;
            const scaleY = this._canvas.height / rect.height;
            return {
                r: Math.floor((clientY - rect.top)  * scaleY / this._cs),
                c: Math.floor((clientX - rect.left) * scaleX / this._cs),
            };
        },

        // Ghost anchor: center piece on cursor (mobile) or top-left (desktop)
        _ghostAnchor(clientX, clientY) {
            const raw = this._cellAt(clientX, clientY);
            if (this._sel < 0 || this.tray[this._sel] === null) return { r: -1, c: -1 };
            if (!this._dragging) return raw; // desktop: top-left anchor
            // Mobile drag: center piece bounding box under finger
            const b = pieceBounds(PIECES[this.tray[this._sel]]);
            return {
                r: raw.r - Math.floor(b.rows / 2),
                c: raw.c - Math.floor(b.cols / 2),
            };
        },

        _canPlace(pi, row, col) {
            if (pi === null) return false;
            for (const [dr, dc] of PIECES[pi].cells) {
                const r = row + dr, c = col + dc;
                if (r < 0 || r >= H || c < 0 || c >= W || this.board[r][c] !== 0) return false;
            }
            return true;
        },

        place(ti, row, col) {
            if (this.over) return false;
            const pi = this.tray[ti];
            if (!this._canPlace(pi, row, col)) return false;

            const piece = PIECES[pi];
            let placed = 0;
            for (const [dr, dc] of piece.cells) { this.board[row+dr][col+dc] = piece.c; placed++; }
            this.score += placed;
            this.tray[ti] = null;

            this._clearLines();

            if (this.tray.every(t => t === null)) {
                for (let i = 0; i < 3; i++) this.tray[i] = pickRandom();
                this.combo = 0;
            }

            this._sel       = -1;
            this._gr        = -1;
            this._gc        = -1;
            this._dirty     = true;
            this._trayDirty = true;

            if (this._checkOver()) {
                this.over = true;
                this._emit('over', { score: this.score });
            }
            return true;
        },

        _clearLines() {
            const rows = [], cols = [];
            for (let r = 0; r < H; r++) if (this.board[r].every(v => v !== 0)) rows.push(r);
            for (let c = 0; c < W; c++) {
                let full = true;
                for (let r = 0; r < H; r++) { if (!this.board[r][c]) { full = false; break; } }
                if (full) cols.push(c);
            }
            if (!rows.length && !cols.length) { this.combo = 0; return; }

            this.combo++;
            const cells = new Set();
            for (const r of rows) for (let c = 0; c < W; c++) cells.add(r * W + c);
            for (const c of cols) for (let r = 0; r < H; r++) cells.add(r * W + c);

            const clears = rows.length + cols.length;
            this.score += cells.size * 10 + clears * 50
                        + (this.combo > 1 ? (this.combo - 1) * 100 : 0);

            this._emit('clear', { rows: rows.length, cols: cols.length, combo: this.combo, score: this.score });

            // Start flash animation, then clear
            this._anim = { cells, frame: 0, total: 9 };
            for (const r of rows) this.board[r].fill(0);
            for (const c of cols) for (let r = 0; r < H; r++) this.board[r][c] = 0;
        },

        _checkOver() {
            for (let ti = 0; ti < 3; ti++) {
                if (this.tray[ti] === null) continue;
                for (let r = 0; r < H; r++)
                    for (let c = 0; c < W; c++)
                        if (this._canPlace(this.tray[ti], r, c)) return false;
            }
            return true;
        },

        // ── Rendering ───────────────────────────────────────────────────────

        _doRender() {
            const ctx = this._ctx, cs = this._cs;
            if (!ctx || !cs) return;
            const cw = cs * W, ch = cs * H;

            ctx.clearRect(0, 0, cw, ch);

            // Background
            ctx.fillStyle = '#0c0e1a';
            ctx.fillRect(0, 0, cw, ch);

            // Grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            for (let r = 0; r <= H; r++) {
                ctx.beginPath(); ctx.moveTo(0, r*cs); ctx.lineTo(cw, r*cs); ctx.stroke();
            }
            for (let c = 0; c <= W; c++) {
                ctx.beginPath(); ctx.moveTo(c*cs, 0); ctx.lineTo(c*cs, ch); ctx.stroke();
            }

            // Ghost
            const gr = this._gr, gc = this._gc;
            if (this._sel >= 0 && gr >= 0 && this.tray[this._sel] !== null) {
                const pi = this.tray[this._sel];
                const valid = this._canPlace(pi, gr, gc);
                ctx.globalAlpha = valid ? 0.48 : 0.20;
                const ghostColor = valid ? COLORS[PIECES[pi].c] : '#ff4444';
                for (const [dr, dc] of PIECES[pi].cells)
                    this._drawCell(ctx, gr+dr, gc+dc, ghostColor, cs, true);
                ctx.globalAlpha = 1;
            }

            // Board cells
            for (let r = 0; r < H; r++)
                for (let c = 0; c < W; c++) {
                    if (!this.board[r][c]) continue;
                    this._drawCell(ctx, r, c, COLORS[this.board[r][c]], cs, false);
                }

            // Clear flash animation
            if (this._anim) {
                const t = this._anim.frame / this._anim.total;
                const alpha = (1 - t) * 0.95;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ffffff';
                for (const key of this._anim.cells) {
                    const r = Math.floor(key / W), c = key % W;
                    const gap = cs * 0.05, x = c*cs+gap, y = r*cs+gap, s = cs-gap*2;
                    this._rrect(ctx, x, y, s, s, Math.max(2, s * 0.18)); ctx.fill();
                }
                ctx.globalAlpha = 1;
                this._anim.frame++;
                if (this._anim.frame >= this._anim.total) this._anim = null;
            }
        },

        _drawCell(ctx, r, c, color, cs, ghost) {
            // Don't draw out-of-bounds (can happen with ghost)
            if (r < 0 || r >= H || c < 0 || c >= W) return;
            const gap = cs * 0.065;
            const x = c*cs+gap, y = r*cs+gap, s = cs-gap*2;
            const rad = Math.max(2, s * 0.18);
            ctx.fillStyle = color;
            this._rrect(ctx, x, y, s, s, rad); ctx.fill();
            if (!ghost) {
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                this._rrect(ctx, x, y, s, s * 0.36, rad); ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                ctx.lineWidth = 1;
                this._rrect(ctx, x+.5, y+.5, s-1, s-1, rad); ctx.stroke();
            }
        },

        _rrect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
            ctx.quadraticCurveTo(x+w, y, x+w, y+r); ctx.lineTo(x+w, y+h-r);
            ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h); ctx.lineTo(x+r, y+h);
            ctx.quadraticCurveTo(x, y+h, x, y+h-r); ctx.lineTo(x, y+r);
            ctx.quadraticCurveTo(x, y, x+r, y); ctx.closePath();
        },

        _renderTray() {
            for (let i = 0; i < 3; i++) {
                const cv = this._trayC[i];
                if (!cv) continue;
                const ctx = cv.getContext('2d');
                const w = cv.offsetWidth  || 88;
                const h = cv.offsetHeight || 88;
                cv.width  = w;
                cv.height = h;
                ctx.clearRect(0, 0, w, h);

                const sel = (this._sel === i);
                const pi  = this.tray[i];
                const used = (pi === null);

                // Slot background
                ctx.fillStyle = sel  ? 'rgba(0,229,255,0.15)'
                               : used ? 'rgba(255,255,255,0.02)'
                                      : 'rgba(255,255,255,0.05)';
                this._rrect(ctx, 1.5, 1.5, w-3, h-3, 10); ctx.fill();

                // Slot border
                ctx.strokeStyle = sel  ? 'rgba(0,229,255,0.7)'
                                : used ? 'rgba(255,255,255,0.04)'
                                       : 'rgba(255,255,255,0.10)';
                ctx.lineWidth = sel ? 2 : 1;
                this._rrect(ctx, 1.5, 1.5, w-3, h-3, 10); ctx.stroke();

                if (used) continue;

                // Glow on selected slot
                if (sel) {
                    ctx.shadowColor = 'rgba(0,229,255,0.45)';
                    ctx.shadowBlur  = 10;
                }

                const piece = PIECES[pi];
                const b = pieceBounds(piece);
                const pad = 14;
                const cs  = Math.min(
                    Math.floor((w - pad*2) / b.cols),
                    Math.floor((h - pad*2) / b.rows),
                    26
                );
                const pw = b.cols * cs, ph = b.rows * cs;
                const ox = Math.floor((w - pw) / 2) - b.c0 * cs;
                const oy = Math.floor((h - ph) / 2) - b.r0 * cs;

                ctx.fillStyle   = COLORS[piece.c];
                ctx.strokeStyle = 'rgba(0,0,0,0.22)';
                ctx.lineWidth   = 1;

                for (const [pr, pc] of piece.cells) {
                    const px = ox + pc * cs, py = oy + pr * cs;
                    const gap = cs * 0.09, bs = cs-gap*2, rad = Math.max(2, bs*0.18);
                    ctx.fillStyle = COLORS[piece.c];
                    this._rrect(ctx, px+gap, py+gap, bs, bs, rad); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.22)';
                    this._rrect(ctx, px+gap, py+gap, bs, bs*0.36, rad); ctx.fill();
                    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
                    this._rrect(ctx, px+gap+.5, py+gap+.5, bs-1, bs-1, rad); ctx.stroke();
                }

                if (sel) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; }
            }
        },

        // ── Input ────────────────────────────────────────────────────────────

        _bindInput() {
            const canvas = this._canvas;

            // Desktop: mouse hover → update ghost position
            canvas.addEventListener('mousemove', e => {
                if (this._sel < 0 || this.over || this._dragging) return;
                const { r, c } = this._ghostAnchor(e.clientX, e.clientY);
                if (r !== this._gr || c !== this._gc) {
                    this._gr = r; this._gc = c; this._dirty = true;
                }
            });
            canvas.addEventListener('mouseleave', () => {
                if (this._dragging) return;
                this._gr = -1; this._gc = -1; this._dirty = true;
            });
            // Desktop: click to place
            canvas.addEventListener('click', e => {
                if (this._sel < 0 || this.over || this._dragging) return;
                const { r, c } = this._ghostAnchor(e.clientX, e.clientY);
                if (this.place(this._sel, r, c)) return;
                // Invalid click — visual shake via dirty flag
                this._dirty = true;
            });

            // Tray: click to select/deselect (desktop)
            this._trayC.forEach((tc, i) => {
                tc.addEventListener('click', () => {
                    if (this.over || this.tray[i] === null || this._dragging) return;
                    this._sel       = (this._sel === i) ? -1 : i;
                    this._gr        = -1;
                    this._gc        = -1;
                    this._dirty     = true;
                    this._trayDirty = true;
                });
                // Mobile: touch-start on tray begins drag
                tc.addEventListener('touchstart', e => {
                    e.preventDefault();
                    if (this.over || this.tray[i] === null) return;
                    this._sel       = i;
                    this._dragging  = true;
                    this._dirty     = true;
                    this._trayDirty = true;
                }, { passive: false });
            });

            // Mobile: drag moves ghost on the board
            document.addEventListener('touchmove', e => {
                if (!this._dragging || this._sel < 0) return;
                e.preventDefault();
                const t = e.touches[0];
                const { r, c } = this._ghostAnchor(t.clientX, t.clientY);
                if (r !== this._gr || c !== this._gc) {
                    this._gr = r; this._gc = c; this._dirty = true;
                }
            }, { passive: false });

            // Mobile: lift finger — place piece or cancel
            document.addEventListener('touchend', e => {
                if (!this._dragging) return;
                this._dragging = false;
                if (this._sel >= 0 && this._gr >= 0) {
                    if (!this.place(this._sel, this._gr, this._gc)) {
                        // Couldn't place — deselect and clear ghost
                        this._sel   = -1;
                        this._gr    = -1;
                        this._gc    = -1;
                        this._dirty     = true;
                        this._trayDirty = true;
                    }
                }
            });
        },
    };

    root.BlastGame = BlastGame;
})(window);
