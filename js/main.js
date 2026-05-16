/**
 * Бутстрап и UI-связывание. Главный цикл, оверлеи, реклама, сохранение.
 */
(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);

    // ===== Определения уровней кампании =====
    const LEVEL_DEFS = [
        // --- Новичок (1–10) ---
        { type:"lines",       goal:4,    start:1, s2:200,   s3:500,    ru:"Очисти 4 линии",        en:"Clear 4 lines"       },
        { type:"lines",       goal:6,    start:1, s2:350,   s3:800,    ru:"Очисти 6 линий",        en:"Clear 6 lines"       },
        { type:"score",       goal:500,  start:1, s2:500,   s3:1200,   ru:"Набери 500 очков",      en:"Reach 500 pts"       },
        { type:"lines",       goal:10,   start:1, s2:700,   s3:1800,   ru:"Очисти 10 линий",       en:"Clear 10 lines"      },
        { type:"score",       goal:1000, start:2, s2:1000,  s3:2500,   ru:"Набери 1 000 очков",    en:"Reach 1 000 pts"     },
        { type:"lines",       goal:12,   start:2, s2:1200,  s3:3000,   ru:"12 линий · скор. 2",    en:"12 lines · lv 2"     },
        { type:"lines_timed", goal:8,    time:90, start:1,  s2:600,    s3:1500,   ru:"8 линий за 90 сек",  en:"8 lines / 90 sec"    },
        { type:"combo",       goal:2,    start:2, s2:1500,  s3:3500,   ru:"Комбо ×2",              en:"Combo ×2"            },
        { type:"score",       goal:2000, start:2, s2:2000,  s3:5000,   ru:"Набери 2 000 очков",    en:"Reach 2 000 pts"     },
        { type:"lines",       goal:15,   start:2, s2:2000,  s3:5000,   ru:"15 линий · скор. 2",    en:"15 lines · lv 2"     },
        // --- Лёгкий (11–20) ---
        { type:"lines_timed", goal:12,   time:90, start:2,  s2:1800,   s3:4500,   ru:"12 линий за 90 сек", en:"12 lines / 90 sec"   },
        { type:"tspin",       goal:1,    start:2, s2:2500,  s3:6000,   ru:"Сделай T-Spin",         en:"Make a T-Spin"       },
        { type:"score",       goal:3500, start:3, s2:3500,  s3:8000,   ru:"Набери 3 500 очков",    en:"Reach 3 500 pts"     },
        { type:"lines",       goal:18,   start:3, s2:3000,  s3:7500,   ru:"18 линий · скор. 3",    en:"18 lines · lv 3"     },
        { type:"combo",       goal:3,    start:3, s2:4000,  s3:9000,   ru:"Комбо ×3",              en:"Combo ×3"            },
        { type:"lines_timed", goal:15,   time:100,start:3,  s2:4500,   s3:10000,  ru:"15 линий за 100 сек",en:"15 lines / 100 sec"  },
        { type:"score",       goal:5000, start:3, s2:5000,  s3:11000,  ru:"Набери 5 000 очков",    en:"Reach 5 000 pts"     },
        { type:"tspin",       goal:2,    start:3, s2:5500,  s3:12000,  ru:"T-Spin ×2",             en:"T-Spin ×2"           },
        { type:"lines",       goal:20,   start:3, s2:5000,  s3:12000,  ru:"20 линий · скор. 3",    en:"20 lines · lv 3"     },
        { type:"b2b",         goal:1,    start:3, s2:6000,  s3:14000,  ru:"Back-to-Back",          en:"Back-to-Back"        },
        // --- Средний (21–30) ---
        { type:"score",       goal:7000, start:4, s2:7000,  s3:16000,  ru:"Набери 7 000 очков",    en:"Reach 7 000 pts"     },
        { type:"lines_timed", goal:20,   time:120,start:4,  s2:7000,   s3:16000,  ru:"20 линий за 2 мин",  en:"20 lines / 2 min"    },
        { type:"combo",       goal:4,    start:4, s2:8000,  s3:18000,  ru:"Комбо ×4",              en:"Combo ×4"            },
        { type:"tspin",       goal:3,    start:4, s2:9000,  s3:20000,  ru:"T-Spin ×3",             en:"T-Spin ×3"           },
        { type:"lines",       goal:25,   start:4, s2:8500,  s3:19000,  ru:"25 линий · скор. 4",    en:"25 lines · lv 4"     },
        { type:"score",       goal:10000,start:4, s2:10000, s3:22000,  ru:"Набери 10 000 очков",   en:"Reach 10 000 pts"    },
        { type:"b2b",         goal:2,    start:4, s2:11000, s3:24000,  ru:"B2B ×2",                en:"B2B ×2"              },
        { type:"lines_timed", goal:25,   time:120,start:5,  s2:11000,  s3:25000,  ru:"25 линий за 2 мин",  en:"25 lines / 2 min"    },
        { type:"score",       goal:13000,start:5, s2:13000, s3:28000,  ru:"13 000 очков · скор. 5",en:"13 000 pts · lv 5"   },
        { type:"tspin",       goal:4,    start:5, s2:13500, s3:29000,  ru:"T-Spin ×4",             en:"T-Spin ×4"           },
        // --- Сложный (31–40) ---
        { type:"lines",       goal:30,   start:5, s2:14000, s3:30000,  ru:"30 линий · скор. 5",    en:"30 lines · lv 5"     },
        { type:"combo",       goal:5,    start:5, s2:15000, s3:32000,  ru:"Комбо ×5",              en:"Combo ×5"            },
        { type:"score",       goal:18000,start:6, s2:18000, s3:38000,  ru:"18 000 очков · скор. 6",en:"18 000 pts · lv 6"   },
        { type:"b2b",         goal:3,    start:5, s2:17000, s3:36000,  ru:"B2B ×3",                en:"B2B ×3"              },
        { type:"lines_timed", goal:30,   time:120,start:6,  s2:18000,  s3:39000,  ru:"30 линий за 2 мин",  en:"30 lines / 2 min"    },
        { type:"tspin",       goal:5,    start:6, s2:20000, s3:43000,  ru:"T-Spin ×5 · скор. 6",   en:"T-Spin ×5 · lv 6"    },
        { type:"score",       goal:25000,start:6, s2:25000, s3:52000,  ru:"25 000 очков",          en:"Reach 25 000 pts"    },
        { type:"lines",       goal:35,   start:6, s2:24000, s3:50000,  ru:"35 линий · скор. 6",    en:"35 lines · lv 6"     },
        { type:"combo",       goal:6,    start:6, s2:26000, s3:55000,  ru:"Комбо ×6",              en:"Combo ×6"            },
        { type:"b2b",         goal:4,    start:6, s2:28000, s3:58000,  ru:"B2B ×4 · скор. 6",      en:"B2B ×4 · lv 6"       },
        // --- Эксперт (41–50) ---
        { type:"score",       goal:35000,start:7, s2:35000, s3:70000,  ru:"35 000 очков · скор. 7",en:"35 000 pts · lv 7"   },
        { type:"tspin",       goal:6,    start:7, s2:36000, s3:72000,  ru:"T-Spin ×6 · скор. 7",   en:"T-Spin ×6 · lv 7"    },
        { type:"lines_timed", goal:35,   time:120,start:7,  s2:37000,  s3:75000,  ru:"35 линий за 2 мин",  en:"35 lines / 2 min"    },
        { type:"lines",       goal:40,   start:7, s2:40000, s3:80000,  ru:"40 линий · скор. 7",    en:"40 lines · lv 7"     },
        { type:"combo",       goal:7,    start:8, s2:43000, s3:86000,  ru:"Комбо ×7 · скор. 8",    en:"Combo ×7 · lv 8"     },
        { type:"b2b",         goal:5,    start:7, s2:44000, s3:88000,  ru:"B2B ×5 · скор. 7",      en:"B2B ×5 · lv 7"       },
        { type:"score",       goal:55000,start:8, s2:55000, s3:110000, ru:"55 000 очков · скор. 8",en:"55 000 pts · lv 8"   },
        { type:"tspin",       goal:8,    start:8, s2:58000, s3:115000, ru:"T-Spin ×8 · скор. 8",   en:"T-Spin ×8 · lv 8"    },
        { type:"lines_timed", goal:40,   time:120,start:9,  s2:62000,  s3:125000, ru:"40 линий за 2 мин",  en:"40 lines / 2 min"    },
        { type:"score",       goal:100000,start:9,s2:100000,s3:200000, ru:"100 000 очков!",        en:"100 000 pts!"        },
    ];

    const MILESTONES = [10000, 50000, 100000, 200000, 500000, 1000000];
    const THEME_KEY = "tetris.theme";
    const BLAST_BEST_KEY = "blastBest";

    let selectedMenuMode = 'classic';

    // ===== Анимированный фон меню =====
    const MenuBg = (() => {
        const SHAPES = [
            [[1,1,1,1]],
            [[1,1],[1,1]],
            [[0,1,0],[1,1,1]],
            [[1,0],[1,1],[0,1]],
            [[0,1],[1,1],[1,0]],
            [[1,0],[1,0],[1,1]],
            [[0,1],[0,1],[1,1]],
        ];
        // Three parallax depth layers: [maxCount, minSize, maxSize, minOp, maxOp, minSpeed, maxSpeed]
        const LAYERS = [
            [10, 10, 17, 0.018, 0.034, 7,  16],   // far  — small, slow, dim
            [12, 19, 29, 0.036, 0.068, 15, 30],   // mid  — medium
            [6,  33, 52, 0.055, 0.100, 27, 50],   // near — large, fast, bright + glow
        ];
        // Classic Tetris piece colours [r,g,b]
        const FLOOR_COLORS = [
            [0,229,255],[224,64,251],[255,224,64],[255,64,129],[41,121,255],[105,240,174],[255,109,0],
        ];
        let canvas, ctx, pieces = [], floorCells = [], running = false, raf = 0, lastTs = 0;
        let accentRgb = [0, 229, 255];

        function rrect(x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y,     x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x,     y + h, r);
            ctx.arcTo(x,     y + h, x,     y,     r);
            ctx.arcTo(x,     y,     x + w, y,     r);
            ctx.closePath();
            ctx.fill();
        }

        function spawn(li, random) {
            const [, mn, mx, mno, mxo, mnv, mxv] = LAYERS[li];
            const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
            const size  = mn + Math.random() * (mx - mn);
            const cols  = shape[0].length, rows = shape.length;
            const w = canvas.width, h = canvas.height;
            return {
                shape, size, layer: li,
                x:  Math.random() * Math.max(1, w - cols * size),
                y:  random ? Math.random() * (h + rows * size) - rows * size : -(rows * size + 4),
                vy: mnv + Math.random() * (mxv - mnv),
                op: mno + Math.random() * (mxo - mno),
            };
        }

        function buildFloor() {
            floorCells = [];
            const w = canvas.width, h = canvas.height;
            if (!w || !h) return;
            const cs = Math.max(18, Math.min(28, Math.round(w / 16)));
            const numCols = Math.ceil(w / cs) + 1;
            const maxH = Math.max(3, Math.floor(h * 0.30 / cs));
            // Smooth random-walk height profile
            let prev = 2 + Math.floor(Math.random() * Math.ceil(maxH * 0.55));
            const heights = [];
            for (let c = 0; c < numCols; c++) {
                prev = Math.max(1, Math.min(maxH, prev + Math.floor((Math.random() - 0.42) * 3)));
                heights.push(prev);
            }
            for (let c = 0; c < numCols; c++) {
                for (let r = 0; r < heights[c]; r++) {
                    if (Math.random() < 0.11) continue; // ~11% holes
                    floorCells.push({
                        x: c * cs, y: h - (r + 1) * cs, cs,
                        rgb: FLOOR_COLORS[Math.floor(Math.random() * FLOOR_COLORS.length)],
                    });
                }
            }
        }

        function resize() {
            if (!canvas) return;
            canvas.width  = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            buildFloor();
        }

        function tick(ts) {
            if (!running) return;
            const dt = Math.min(50, ts - lastTs) / 1000;
            lastTs = ts;

            LAYERS.forEach((cfg, li) => {
                if (pieces.filter(p => p.layer === li).length < cfg[0] && Math.random() < 0.06)
                    pieces.push(spawn(li, false));
            });
            pieces = pieces.filter(p => { p.y += p.vy * dt; return p.y < canvas.height + 80; });

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Tetris floor — accumulated coloured blocks
            floorCells.forEach(cell => {
                const [r, g, b] = cell.rgb;
                const gap = cell.cs * 0.08, bs = cell.cs - gap * 2;
                ctx.fillStyle = `rgba(${r},${g},${b},0.065)`;
                rrect(cell.x + gap, cell.y + gap, bs, bs, Math.max(1, bs * 0.12));
            });

            const [r, g, b] = accentRgb;
            for (let li = 0; li < 3; li++) {
                if (li === 2) { ctx.shadowColor = `rgba(${r},${g},${b},0.55)`; ctx.shadowBlur = 9; }
                pieces.filter(p => p.layer === li).forEach(p => {
                    ctx.fillStyle = `rgba(${r},${g},${b},${p.op})`;
                    const gap = p.size * 0.09, rad = Math.max(1.5, p.size * 0.18);
                    const bs  = p.size - gap * 2;
                    p.shape.forEach((row, ry) =>
                        row.forEach((cell, cx) => {
                            if (!cell) return;
                            rrect(p.x + cx * p.size + gap, p.y + ry * p.size + gap, bs, bs, rad);
                        })
                    );
                });
                if (li === 2) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; }
            }
            raf = requestAnimationFrame(tick);
        }

        return {
            init(canvasEl) {
                canvas = canvasEl;
                ctx = canvas.getContext('2d');
                window.addEventListener('resize', resize);
                resize(); // also calls buildFloor
                LAYERS.forEach((_, li) => {
                    const n = [10, 12, 5][li];
                    for (let i = 0; i < n; i++) pieces.push(spawn(li, true));
                });
            },
            start() {
                if (running) return;
                running = true; resize();
                lastTs = performance.now();
                raf = requestAnimationFrame(tick);
            },
            stop() { running = false; cancelAnimationFrame(raf); },
            setAccent(hex) {
                if (!hex || !hex.startsWith('#') || hex.length < 7) return;
                accentRgb = [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
            },
        };
    })();

    // ===== DOM =====
    const dom = {
        boot: $("boot"),
        app: document.querySelector(".app"),
        board: $("boardCanvas"),
        hold: $("holdCanvas"),
        next: $("nextCanvas"),
        playfield: $("playfield"),
        touchpad: $("touchpad"),
        toast: $("toast"),

        statScore: $("statScore"),
        statBest: $("statBest"),
        statLines: $("statLines"),
        statLinesGoal: $("statLinesGoal"),
        statLevel: $("statLevel"),
        levelBarFill: $("levelBarFill"),
        elapsedStat: $("elapsedStat"),
        statElapsed: $("statElapsed"),
        timerStat: $("timerStat"),
        statTimer: $("statTimer"),
        timerBarFill: $("timerBarFill"),

        btnLang: $("btnLang"),
        btnMute: $("btnMute"),
        btnPause: $("btnPause"),
        langLabel: $("langLabel"),

        overlayMenu: $("overlayMenu"),
        overlayBlast: $("overlayBlast"),
        overlayBlastOver: $("overlayBlastOver"),
        overlayLevelSelect: $("overlayLevelSelect"),
        overlayPause: $("overlayPause"),
        overlayLevelComplete: $("overlayLevelComplete"),
        overlayGameOver: $("overlayGameOver"),
        overlaySettings: $("overlaySettings"),
        overlayLeaderboard: $("overlayLeaderboard"),

        modeCardClassic: $("modeCardClassic"),
        modeCardBlast: $("modeCardBlast"),

        blastCanvas: $("blastCanvas"),
        blastField: $("blastField"),
        blastSlot0: $("blastSlot0"),
        blastSlot1: $("blastSlot1"),
        blastSlot2: $("blastSlot2"),
        blastScore: $("blastScore"),
        blastBestDisp: $("blastBestDisp"),
        blastGoScore: $("blastGoScore"),
        blastGoBest: $("blastGoBest"),
        rowBlastBest: $("rowBlastBest"),
        btnBlastDoubleScore: $("btnBlastDoubleScore"),
        btnBlastMenu: $("btnBlastMenu"),
        btnBlastRetry: $("btnBlastRetry"),
        btnBlastGoMenu: $("btnBlastGoMenu"),

        levelGrid: $("levelGrid"),
        streakBadge: $("streakBadge"),
        levelsProgress: $("levelsProgress"),

        btnMarathon: $("btnMarathon"),
        btnLevels: $("btnLevels"),
        btnLeaderboard: $("btnLeaderboard"),
        btnOpenSettings: $("btnOpenSettings"),
        btnMuteMenu: $("btnMuteMenu"),
        btnLangMenu: $("btnLangMenu"),
        langLabelMenu: $("langLabelMenu"),
        controlsHint: $("controlsHint"),

        btnLevelBack: $("btnLevelBack"),

        btnResume: $("btnResume"),
        btnRestartFromPause: $("btnRestartFromPause"),
        btnPauseLeaderboard: $("btnPauseLeaderboard"),
        btnPauseMenu: $("btnPauseMenu"),

        goHeading: $("goHeading"),
        lcHeading: $("lcHeading"),
        lcStars: $("lcStars"),
        lcScore: $("lcScore"),
        lcLines: $("lcLines"),
        btnNextLevel: $("btnNextLevel"),
        btnRetryLevel: $("btnRetryLevel"),
        btnToMenuFromLC: $("btnToMenuFromLC"),

        rowFinalBest: $("rowFinalBest"),
        finalScore: $("finalScore"),
        finalBest: $("finalBest"),
        finalLines: $("finalLines"),
        finalLevel: $("finalLevel"),
        finalTime: $("finalTime"),
        finalPPS: $("finalPPS"),
        btnRevive: $("btnRevive"),
        btnDoubleScore: $("btnDoubleScore"),
        btnRetry: $("btnRetry"),
        btnGOLeaderboard: $("btnGOLeaderboard"),
        btnGoMenu: $("btnGoMenu"),

        btnSettingsClose: $("btnSettingsClose"),
        btnResetSettings: $("btnResetSettings"),
        btnLangSettings: $("btnLangSettings"),
        btnMuteSettings: $("btnMuteSettings"),
        langLabelSettings: $("langLabelSettings"),
        themeNeon: $("themeNeon"),
        themeMinimal: $("themeMinimal"),
        themeWood: $("themeWood"),
        themeRetro: $("themeRetro"),

        lbList: $("lbList"),
        btnLbClose: $("btnLbClose"),

        settingCtrlMode: $("settingCtrlMode"),
        ctrlGesture: $("ctrlGesture"),
        ctrlButtons: $("ctrlButtons"),
    };

    // ===== Состояние =====
    let game = null, renderer = null, input = null;
    let advPaused = false, lastFrame = 0, lbReturnEl = null;

    // — Классика (марафон / уровни) —
    let gameMode = "marathon", currentCampaignLevel = 1;
    let levelGoalLines = 0, levelGoalMet = false;
    let sessionTspins = 0, sessionB2bs = 0;
    let levelTimeLeft = 0, levelTimerInt = 0, elapsedTimerInt = 0;
    let gameStartTime = 0, piecesPlaced = 0, sessionMaxCombo = 0;
    let reviveAvailable = true;
    let lastGameScore = 0, scoreDoubled = false, lastMilestone = 0;

    // — Block Blast —
    let blastLastScore = 0, blastScoreDoubled = false;

    // ===== Темы =====
    function loadTheme() {
        try { return localStorage.getItem(THEME_KEY) || 'neon'; } catch(_) { return 'neon'; }
    }
    function saveTheme(name) {
        try { localStorage.setItem(THEME_KEY, name); } catch(_) {}
    }
    function applyTheme(name) {
        document.documentElement.dataset.theme = name;
        saveTheme(name);
        // Update MenuBg accent color
        const accentMap = { neon:'#00e5ff', minimal:'#818cf8', wood:'#e07820', retro:'#ffec27' };
        MenuBg.setAccent(accentMap[name] || accentMap.neon);
        // Update active state on theme cards
        ['themeNeon','themeMinimal','themeWood','themeRetro'].forEach(id => {
            const btn = dom[id];
            if (btn) btn.classList.toggle('is-active', btn.dataset.themeSelect === name);
        });
    }

    // ===== Кампания =====
    function getCampaignData() {
        try { return JSON.parse(Storage.get("campaignJson") || "{}"); } catch(_) { return {}; }
    }
    function saveCampaignProgress(level, stars, score) {
        const d = getCampaignData();
        const key = String(level);
        const prev = d[key] || { stars:0, score:0 };
        d[key] = { stars: Math.max(prev.stars, stars), score: Math.max(prev.score, score) };
        const unlocked = d._unlocked || 1;
        if (stars > 0 && level >= unlocked) d._unlocked = level + 1;
        Storage.set({ campaignJson: JSON.stringify(d) });
        return d;
    }
    function calcStars(level, score) {
        const def = LEVEL_DEFS[level - 1];
        if (!def) return 1;
        if (score >= def.s3) return 3;
        if (score >= def.s2) return 2;
        return 1;
    }

    // ===== Серия дней =====
    function getStreakData() {
        try { return JSON.parse(Storage.get("streakJson") || "{}"); } catch(_) { return {}; }
    }
    function touchStreak() {
        const today = new Date().toISOString().slice(0,10);
        const d = getStreakData();
        if (d.date === today) return d.count || 1;
        const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
        const count = d.date === yesterday ? (d.count||1)+1 : 1;
        Storage.set({ streakJson: JSON.stringify({date:today, count}) });
        return count;
    }
    function renderStreakBadge() {
        const streak = getStreakData();
        if (!streak.count || streak.count < 2) { dom.streakBadge.hidden = true; return; }
        dom.streakBadge.hidden = false;
        dom.streakBadge.textContent = I18N.t("streak", { n: streak.count });
    }

    // ===== Сетка уровней =====
    function makeStarsHtml(count, total) {
        let h = "";
        for (let s=1; s<=total; s++) h += `<span class="${s<=count?"star-fill":"star-empty"}">★</span>`;
        return h;
    }
    function renderLevelGrid() {
        const campaign = getCampaignData();
        const unlocked = campaign._unlocked || 1;
        dom.levelGrid.innerHTML = "";
        for (let lvl=1; lvl<=LEVEL_DEFS.length; lvl++) {
            const data = campaign[String(lvl)] || { stars:0, score:0 };
            const isLocked = lvl > unlocked;
            const def = LEVEL_DEFS[lvl-1];
            const label = I18N.current === "ru" ? def.ru : def.en;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "level-card" + (isLocked?" level-card--locked":"") + (data.stars>0?" has-score":"");
            btn.disabled = isLocked;
            btn.innerHTML = `<span class="level-card__num">${lvl}</span>
                <div class="level-card__stars">${isLocked?"":makeStarsHtml(data.stars,3)}</div>
                <span class="level-card__type">${isLocked?"":label}</span>`;
            if (!isLocked) { const level=lvl; btn.addEventListener("click",()=>startLevel(level)); }
            dom.levelGrid.appendChild(btn);
        }
        const completed = Object.keys(campaign).filter(k=>k!=='_unlocked'&&(campaign[k].stars||0)>0).length;
        dom.levelsProgress.textContent = `${completed}/${LEVEL_DEFS.length}`;
    }

    // ===== Тосты =====
    let toastTimer = 0;
    function showToast(text, opts={}) {
        if (!text) return;
        const el = dom.toast;
        el.textContent = text;
        el.classList.toggle("is-accent", !!opts.accent);
        el.classList.add("is-show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(()=>el.classList.remove("is-show"), opts.duration||1100);
    }
    function bump(el) { el.classList.remove("is-bumped"); void el.offsetWidth; el.classList.add("is-bumped"); }

    // ===== Прогресс-бар =====
    function updateProgressBar() {
        let pct = 0;
        if (gameMode !== "level") {
            pct = ((game.lines%10)/10)*100;
        } else {
            const def = LEVEL_DEFS[currentCampaignLevel-1];
            switch (def.type) {
                case "lines": case "lines_timed": pct = Math.min(1, game.lines/def.goal)*100; break;
                case "score":  pct = Math.min(1, game.score/def.goal)*100; break;
                case "tspin":  pct = Math.min(1, sessionTspins/def.goal)*100; break;
                case "combo":  pct = Math.min(1, sessionMaxCombo/def.goal)*100; break;
                case "b2b":    pct = Math.min(1, sessionB2bs/def.goal)*100; break;
            }
        }
        dom.levelBarFill.style.width = pct + "%";
    }

    // ===== Elapsed timer =====
    function startElapsedTimer() {
        clearInterval(elapsedTimerInt);
        dom.elapsedStat.hidden = false;
        dom.statElapsed.textContent = "0:00";
        elapsedTimerInt = setInterval(() => {
            if (!game || game.state !== "running") return;
            const sec = Math.floor((Date.now() - gameStartTime) / 1000);
            const m = Math.floor(sec/60), s = sec%60;
            dom.statElapsed.textContent = `${m}:${s.toString().padStart(2,"0")}`;
        }, 1000);
    }
    function stopElapsedTimer() {
        clearInterval(elapsedTimerInt);
        dom.elapsedStat.hidden = true;
    }

    // ===== Countdown timer =====
    function startLevelTimer(seconds) {
        clearInterval(levelTimerInt);
        levelTimeLeft = seconds;
        dom.timerStat.hidden = false;
        _updateTimerDisplay();
        levelTimerInt = setInterval(() => {
            if (game && game.state !== "running") return;
            levelTimeLeft = Math.max(0, levelTimeLeft-1);
            _updateTimerDisplay();
            if (levelTimeLeft === 0) { clearInterval(levelTimerInt); onTimerEnd(); }
        }, 1000);
    }
    function stopLevelTimer() { clearInterval(levelTimerInt); dom.timerStat.hidden = true; }
    function _updateTimerDisplay() {
        const def = LEVEL_DEFS[currentCampaignLevel-1];
        const total = (def && def.time) || 1;
        const m = Math.floor(levelTimeLeft/60), s = levelTimeLeft%60;
        dom.statTimer.textContent = `${m}:${s.toString().padStart(2,"0")}`;
        dom.timerBarFill.style.width = ((levelTimeLeft/total)*100)+"%";
        const low = levelTimeLeft <= 20;
        dom.timerBarFill.classList.toggle("is-danger", low);
        dom.statTimer.classList.toggle("is-danger", low);
    }
    function onTimerEnd() {
        if (levelGoalMet) return;
        if (game.lines >= levelGoalLines) { setTimeout(()=>completeLevelGame(),0); return; }
        if (game && game.state === "running") game.pause();
        setPauseButton(false);
        SDK.gameplayStop();
        Audio.gameOver();
        stopElapsedTimer();
        showGameOverScreen({ score:game.score, lines:game.lines, level:game.level }, "time_up");
    }

    // ===== Цель уровня =====
    function checkGoal() {
        if (levelGoalMet || gameMode !== "level") return;
        const def = LEVEL_DEFS[currentCampaignLevel-1];
        let met = false;
        switch (def.type) {
            case "lines": case "lines_timed": met = game.lines >= def.goal; break;
            case "score":  met = game.score >= def.goal; break;
            case "tspin":  met = sessionTspins >= def.goal; break;
            case "combo":  met = sessionMaxCombo >= def.goal; break;
            case "b2b":    met = sessionB2bs >= def.goal; break;
        }
        if (met) completeLevelGame();
    }

    // ===== Авто-прогресс кампании из марафона =====
    // После каждого марафона проверяем, какие задания кампании выполнены.
    // lines_timed пропускаем — в марафоне нельзя проверить временное ограничение.
    function checkCampaignFromMarathon(payload) {
        let count = 0;
        for (let lvl = 1; lvl <= LEVEL_DEFS.length; lvl++) {
            const data = getCampaignData();
            if (lvl > (data._unlocked || 1)) break; // каждый следующий открывается только по цепочке
            const existing = data[String(lvl)] || { stars: 0 };
            if (existing.stars > 0) continue;
            const def = LEVEL_DEFS[lvl - 1];
            let met = false;
            switch (def.type) {
                case "lines":  met = payload.lines >= def.goal; break;
                case "score":  met = payload.score >= def.goal; break;
                case "combo":  met = sessionMaxCombo >= def.goal; break;
                case "tspin":  met = sessionTspins >= def.goal; break;
                case "b2b":    met = sessionB2bs >= def.goal; break;
                // lines_timed: пропускаем — нет гарантии, что линии прошли вовремя
            }
            if (met) {
                saveCampaignProgress(lvl, Math.max(1, calcStars(lvl, payload.score)), payload.score);
                count++;
            }
        }
        return count;
    }

    // ===== Сайдбар =====
    function refreshStats() {
        dom.statScore.textContent = game.score;
        dom.statLines.textContent = game.lines;
        dom.statLevel.textContent = game.level;
        dom.statBest.textContent = Storage.get("best").toLocaleString();
        if (gameMode === "level") {
            const def = LEVEL_DEFS[currentCampaignLevel-1];
            const showGoal = def.type === "lines" || def.type === "lines_timed";
            dom.statLinesGoal.hidden = !showGoal;
            if (showGoal) dom.statLinesGoal.textContent = "/"+def.goal;
        } else {
            dom.statLinesGoal.hidden = true;
        }
        updateProgressBar();
    }

    // ===== Оверлеи =====
    const ALL_OVERLAY_KEYS = [
        "overlayMenu","overlayBlast","overlayBlastOver",
        "overlayLevelSelect","overlayPause",
        "overlayLevelComplete","overlayGameOver","overlaySettings","overlayLeaderboard",
    ];
    function showOverlay(el) {
        ALL_OVERLAY_KEYS.forEach(k=>dom[k].classList.remove("overlay--active"));
        if (el) el.classList.add("overlay--active");
        dom.app.setAttribute("aria-hidden", el?"true":"false");
        if (el === dom.overlayMenu) MenuBg.start(); else MenuBg.stop();
    }
    function hideOverlays() { showOverlay(null); }
    function setPauseButton(running) { dom.btnPause.disabled = !running; }

    // ===== Игровой цикл =====
    function loop(ts) {
        const dt = Math.min(64, ts - (lastFrame||ts));
        lastFrame = ts;
        if (game) game.update(dt);
        if (input) input.update(dt);
        if (renderer) renderer.render(dt);
        requestAnimationFrame(loop);
    }

    // ===== Запуск =====
    // ===== Режим игры (меню) =====
    function setMenuMode(mode) {
        selectedMenuMode = mode;
        dom.modeCardClassic.classList.toggle('mode-card--active', mode === 'classic');
        dom.modeCardBlast.classList.toggle('mode-card--active', mode === 'blast');
        dom.btnLevels.hidden      = (mode === 'blast');
        dom.btnLeaderboard.hidden = (mode === 'blast');
        if (dom.controlsHint) dom.controlsHint.hidden = (mode === 'blast');
    }

    // ===== Block Blast =====
    function startBlast() {
        tryFullscreen();
        hideOverlays();
        setPauseButton(false);
        SDK.gameplayStart();
        Audio.unlock();
        touchStreak();
        blastLastScore = 0;
        blastScoreDoubled = false;
        dom.btnBlastDoubleScore.hidden = true;
        const best = parseInt(Storage.get(BLAST_BEST_KEY)) || 0;
        dom.blastBestDisp.textContent = best.toLocaleString();
        dom.blastScore.textContent = '0';
        showOverlay(dom.overlayBlast);
        BlastGame.start();
        BlastGame.on('clear', ({ rows, cols, combo, score }) => {
            dom.blastScore.textContent = score.toLocaleString();
            const n = rows + cols;
            if (combo > 1) showToast(I18N.t('combo') + combo, { accent: true, duration: 900 });
            else if (n >= 2) showToast(n + (I18N.current === 'ru' ? ' линий!' : ' lines!'), { accent: true, duration: 900 });
        });
        BlastGame.on('over', async ({ score }) => {
            SDK.gameplayStop();
            Audio.gameOver();
            const prev  = parseInt(Storage.get(BLAST_BEST_KEY)) || 0;
            const best2 = Math.max(score, prev);
            if (best2 > prev) Storage.set({ [BLAST_BEST_KEY]: best2 });
            blastLastScore = score;
            await new Promise(r => setTimeout(r, 700));
            dom.blastGoScore.textContent = score.toLocaleString();
            dom.blastGoBest.textContent  = best2.toLocaleString();
            dom.btnBlastDoubleScore.hidden = true;
            showOverlay(dom.overlayBlastOver);
            await SDK.showInterstitial();
            // Only reveal the button if the user is still on this overlay (not navigated away).
            if (dom.overlayBlastOver.classList.contains('overlay--active')) {
                dom.btnBlastDoubleScore.hidden = !SDK.ready || score === 0 || blastScoreDoubled;
            }
        });
    }

    function startMarathon() {
        gameMode="marathon"; currentCampaignLevel=1; levelGoalLines=0; levelGoalMet=false;
        sessionTspins=0; sessionB2bs=0; stopLevelTimer();
        _startGame(1);
    }
    function startLevel(n) {
        gameMode="level"; currentCampaignLevel=n;
        levelGoalLines=LEVEL_DEFS[n-1].goal; levelGoalMet=false;
        sessionTspins=0; sessionB2bs=0;
        _startGame(LEVEL_DEFS[n-1].start);
        const def=LEVEL_DEFS[n-1];
        const label=I18N.current==="ru"?def.ru:def.en;
        setTimeout(()=>showToast("▶ "+label,{accent:true,duration:2200}),300);
        if (def.type==="lines_timed") startLevelTimer(def.time);
    }
    function _startGame(startLvl) {
        tryFullscreen();
        reviveAvailable=true; scoreDoubled=false; gameStartTime=Date.now();
        piecesPlaced=0; sessionMaxCombo=0; lastGameScore=0; lastMilestone=0;
        hideOverlays();
        setPauseButton(true);
        game.start(startLvl);
        refreshStats();
        startElapsedTimer();
        SDK.gameplayStart();
        Audio.unlock();
        touchStreak();
    }

    // ===== Уровень пройден =====
    function completeLevelGame() {
        if (levelGoalMet) return;
        levelGoalMet=true;
        stopLevelTimer();
        stopElapsedTimer();
        if (game && game.state==="running") game.pause();
        setPauseButton(false);
        SDK.gameplayStop();
        Audio.levelUp();
        const score=game.score, lines=game.lines;
        const stars=calcStars(currentCampaignLevel,score);
        saveCampaignProgress(currentCampaignLevel,stars,score);
        dom.lcHeading.textContent=I18N.t("level_complete");
        dom.lcScore.textContent=score.toLocaleString();
        dom.lcLines.textContent=lines;
        dom.lcStars.innerHTML=makeStarsHtml(stars,3);
        dom.btnNextLevel.hidden=currentCampaignLevel>=LEVEL_DEFS.length;
        showOverlay(dom.overlayLevelComplete);
        renderLevelGrid();
        SDK.showInterstitial();
    }

    // ===== Пауза =====
    function pauseGame() {
        if (!game||game.state!=="running") return;
        game.pause(); showOverlay(dom.overlayPause); SDK.gameplayStop();
    }
    function resumeGame() {
        if (!game||game.state!=="paused") return;
        game.resume(); hideOverlays(); SDK.gameplayStart();
    }
    function togglePause() {
        if (!game) return;
        if (game.state==="running") pauseGame();
        else if (game.state==="paused") resumeGame();
    }

    // ===== В меню =====
    function goToMenu() {
        stopLevelTimer(); stopElapsedTimer();
        if (game&&game.state==="running") { game.pause(); SDK.gameplayStop(); }
        setPauseButton(false);
        renderStreakBadge(); renderLevelGrid();
        showOverlay(dom.overlayMenu);
    }

    // ===== Конец игры =====
    async function endGame(payload) {
        if (levelGoalMet) return;
        stopLevelTimer(); stopElapsedTimer();
        setPauseButton(false); SDK.gameplayStop(); Audio.gameOver();
        lastGameScore=payload.score;
        const newCampaign = gameMode === "marathon" ? checkCampaignFromMarathon(payload) : 0;
        dom.goHeading.textContent=I18N.t("game_over");
        await showGameOverScreen(payload, null);
        if (newCampaign > 0) {
            const msg = I18N.current === "ru"
                ? `+${newCampaign} ${newCampaign === 1 ? "задание" : "заданий"} выполнено!`
                : `+${newCampaign} challenge${newCampaign > 1 ? "s" : ""} completed!`;
            setTimeout(() => showToast(msg, {accent: true, duration: 2500}), 700);
        }
    }
    async function showGameOverScreen(payload, titleKey) {
        if (titleKey) dom.goHeading.textContent=I18N.t(titleKey);
        const elapsed=gameStartTime?(Date.now()-gameStartTime)/1000:0;
        const pps=piecesPlaced>0&&elapsed>0?(piecesPlaced/elapsed).toFixed(2):"—";
        const m=Math.floor(elapsed/60), s=Math.floor(elapsed%60);
        const prevBest=Storage.get("best");
        const isMarathon=gameMode==="marathon";
        const isNewRecord=isMarathon&&payload.score>prevBest&&payload.score>0;
        const newBest=isNewRecord?payload.score:prevBest;
        if (isNewRecord) {
            Storage.set({best:payload.score});
            SDK.submitScore(payload.score).catch(()=>{});
            // Просим оценить игру при первом рекорде
            setTimeout(()=>SDK.requestReview().catch(()=>{}), 1500);
        }
        Storage.set({
            totalLines:Storage.get("totalLines")+payload.lines,
            totalGames:Storage.get("totalGames")+1,
            maxCombo:Math.max(Storage.get("maxCombo"),sessionMaxCombo),
            maxLevel:Math.max(Storage.get("maxLevel"),payload.level),
        });
        // Предлагаем ярлык после 3-й и 10-й игры
        const _tg = Storage.get("totalGames");
        if (_tg === 3 || _tg === 10) setTimeout(()=>SDK.showShortcutPrompt().catch(()=>{}), 2000);
        dom.finalScore.textContent=payload.score.toLocaleString();
        dom.finalBest.textContent=newBest.toLocaleString();
        dom.finalLines.textContent=payload.lines;
        dom.finalLevel.textContent=payload.level;
        dom.finalTime.textContent=`${m}:${s.toString().padStart(2,"0")}`;
        dom.finalPPS.textContent=pps;
        dom.rowFinalBest.hidden=!isMarathon;
        dom.rowFinalBest.classList.toggle("is-record",isNewRecord);
        // Hide rewarded buttons while the interstitial is playing; show them once it closes.
        // waitForAdSlot in showRewarded enforces a 2 s gap before the next rewarded call.
        dom.btnRevive.hidden=true;
        dom.btnDoubleScore.hidden=true;
        dom.btnGOLeaderboard.hidden=!isMarathon;
        lastGameScore=payload.score;
        showOverlay(dom.overlayGameOver);
        await SDK.showInterstitial();
        dom.btnRevive.hidden=!reviveAvailable||!SDK.ready||!isMarathon;
        dom.btnDoubleScore.hidden=!isMarathon||!SDK.ready||payload.score===0||scoreDoubled;
    }

    // ===== Возрождение =====
    async function tryRevive() {
        if (!reviveAvailable) return;
        dom.btnRevive.disabled = true;
        const result = await SDK.showRewarded();
        dom.btnRevive.disabled = false;
        if (!result.rewarded) {
            if (result.reason === 'error' || result.reason === 'timeout')
                showToast(I18N.t('ad_unavailable'), { duration: 1800 });
            return;
        }
        reviveAvailable = false;
        dom.btnRevive.hidden = true;
        if (!game.revive() || game.state !== 'running') {
            showOverlay(dom.overlayGameOver);
            return;
        }
        hideOverlays();
        setPauseButton(true);
        refreshStats();
        startElapsedTimer();
        SDK.gameplayStart();
        Audio.unlock();
    }
    async function tryDoubleScore() {
        if (scoreDoubled || !SDK.ready) return;
        dom.btnDoubleScore.disabled = true;
        const result = await SDK.showRewarded();
        dom.btnDoubleScore.disabled = false;
        if (!result.rewarded) {
            if (result.reason === 'error' || result.reason === 'timeout')
                showToast(I18N.t('ad_unavailable'), { duration: 1800 });
            return;
        }
        scoreDoubled = true;
        dom.btnDoubleScore.hidden = true;
        const doubled = lastGameScore * 2;
        dom.finalScore.textContent = doubled.toLocaleString();
        if (doubled > Storage.get("best")) {
            Storage.set({ best: doubled });
            dom.finalBest.textContent = doubled.toLocaleString();
            dom.rowFinalBest.classList.add("is-record");
            SDK.submitScore(doubled).catch(() => {});
        }
    }

    async function tryBlastDoubleScore() {
        if (blastScoreDoubled || !SDK.ready) return;
        dom.btnBlastDoubleScore.disabled = true;
        const result = await SDK.showRewarded();
        dom.btnBlastDoubleScore.disabled = false;
        if (!result.rewarded) {
            if (result.reason === 'error' || result.reason === 'timeout')
                showToast(I18N.t('ad_unavailable'), { duration: 1800 });
            return;
        }
        blastScoreDoubled = true;
        dom.btnBlastDoubleScore.hidden = true;
        const doubled = blastLastScore * 2;
        dom.blastGoScore.textContent = doubled.toLocaleString();
        const prev = parseInt(Storage.get(BLAST_BEST_KEY)) || 0;
        if (doubled > prev) {
            Storage.set({ [BLAST_BEST_KEY]: doubled });
            dom.blastGoBest.textContent = doubled.toLocaleString();
            if (dom.rowBlastBest) dom.rowBlastBest.classList.add('is-record');
        }
    }

    // ===== Лидерборд =====
    function showLeaderboard(returnEl) {
        lbReturnEl=returnEl||dom.overlayMenu;
        if (!SDK.leaderboards) { showToast(I18N.t("lb_unavailable"),{duration:1800}); return; }
        dom.lbList.innerHTML=`<div class="lb-loading">${I18N.t("loading")}</div>`;
        showOverlay(dom.overlayLeaderboard);
        function loadLbEntries() {
            dom.lbList.innerHTML=`<div class="lb-loading">${I18N.t("loading")}</div>`;
            SDK.getLeaderboardEntries(10)
                .then(data=>{
                    if (!data||!data.entries||!data.entries.length) {
                        _lbError(); return;
                    }
                    const myId=SDK.player?SDK.player.uniqueID:null;
                    dom.lbList.innerHTML=data.entries.map(e=>{
                        const isMe=myId&&e.player&&e.player.uniqueID===myId;
                        const name=escHtml((e.player&&(e.player.publicName||e.player.getName&&e.player.getName()))||"—");
                        return `<div class="lb-entry${isMe?" is-me":""}"><span class="lb-rank">${e.rank}</span><span class="lb-name">${name}</span><span class="lb-score">${e.score.toLocaleString()}</span></div>`;
                    }).join("");
                })
                .catch(_lbError);
        }
        function _lbError() {
            dom.lbList.innerHTML=`<div class="lb-loading">${I18N.t("lb_unavailable")}<br><button id="lbRetryBtn" class="btn btn--ghost" style="margin-top:10px;width:auto;padding:6px 16px;font-size:13px">${I18N.t("retry")}</button></div>`;
            const btn=document.getElementById("lbRetryBtn");
            if (btn) btn.addEventListener("click", loadLbEntries);
        }
        loadLbEntries();
    }
    function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

    // ===== Синхронизация кнопок =====
    function syncCtrlMode() {
        const mode = InputPrefs.current.controlMode || "gesture";
        [dom.ctrlGesture, dom.ctrlButtons].forEach(btn => {
            if (btn) btn.classList.toggle("is-active", btn.dataset.ctrl === mode);
        });
    }
    function syncMuteButtons() {
        const muted=Audio.muted;
        [dom.btnMute,dom.btnMuteMenu,dom.btnMuteSettings].forEach(b=>{
            if (!b) return;
            b.classList.toggle("is-active",!muted);
            b.setAttribute("aria-pressed",String(!muted));
        });
    }
    function syncLangButtons() {
        const lang=I18N.current.toUpperCase();
        [dom.langLabel,dom.langLabelMenu,dom.langLabelSettings].forEach(el=>{ if(el) el.textContent=lang; });
    }

    // ===== События игры =====
    function bindGameEvents() {
        game.on("scoreChanged",()=>{
            dom.statScore.textContent=game.score;
            dom.statLines.textContent=game.lines;
            dom.statLevel.textContent=game.level;
            updateProgressBar();
            if (gameMode==="level") {
                const def=LEVEL_DEFS[currentCampaignLevel-1];
                if (def.type==="score"&&!levelGoalMet) checkGoal();
            }
            if (gameMode==="marathon") {
                for (const m of MILESTONES) {
                    if (game.score>=m&&lastMilestone<m) {
                        lastMilestone=m;
                        showToast(I18N.t("score_milestone",{n:m.toLocaleString()}),{accent:true,duration:1400});
                        Audio.levelUp(); break;
                    }
                }
            }
        });
        game.on("levelUp",lvl=>{
            bump(dom.statLevel); Audio.levelUp();
            showToast(I18N.t("level_up",{n:lvl}),{accent:true,duration:1000});
        });
        game.on("linesCleared",info=>{
            bump(dom.statLines); Audio.clear(info.count);
            if (info.tSpin) {
                sessionTspins++;
                if (gameMode==="level") {
                    const def=LEVEL_DEFS[currentCampaignLevel-1];
                    if (def.type==="tspin") {
                        showToast(`T-Spin! ${sessionTspins}/${def.goal}`,{accent:true,duration:1300});
                        updateProgressBar();
                        if (sessionTspins>=def.goal) setTimeout(()=>checkGoal(),300);
                    }
                }
                Audio.tspin();
            }
            if (info.b2b) {
                sessionB2bs++;
                if (gameMode==="level") {
                    const def=LEVEL_DEFS[currentCampaignLevel-1];
                    if (def.type==="b2b") {
                        showToast(`B2B! ${sessionB2bs}/${def.goal}`,{accent:true,duration:1300});
                        updateProgressBar();
                        if (sessionB2bs>=def.goal) setTimeout(()=>checkGoal(),300);
                    }
                }
            }
            if (info.combo>sessionMaxCombo) {
                sessionMaxCombo=info.combo;
                if (gameMode==="level") {
                    const def=LEVEL_DEFS[currentCampaignLevel-1];
                    if (def.type==="combo") { updateProgressBar(); if (sessionMaxCombo>=def.goal) setTimeout(()=>checkGoal(),300); }
                }
            }
            if (gameMode==="level"&&!levelGoalMet) {
                const def=LEVEL_DEFS[currentCampaignLevel-1];
                if (def.type==="lines"||def.type==="lines_timed") {
                    if (game.lines>=def.goal) setTimeout(()=>checkGoal(),300);
                }
            }
            const parts=[];
            if (!info.tSpin&&info.count===4) { parts.push(I18N.t("tetris")); Audio.clear(4); }
            if (info.b2b&&!info.tSpin) parts.push(I18N.t("back_to_back"));
            if (info.combo>0) parts.push(I18N.t("combo")+info.combo);
            if (info.perfect) { parts.push(I18N.t("perfect_clear")); Audio.perfectClear(); }
            if (parts.length) showToast(parts.join(" · "),{accent:true,duration:1300});
        });
        game.on("lock",()=>{ piecesPlaced++; Audio.lock(); });
        game.on("gameOver",p=>endGame(p));
    }

    // ===== Фуллскрин =====
    function tryFullscreen() {
        if (!document.fullscreenEnabled) return;
        if (document.fullscreenElement) return;
        document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }

    // ===== Кнопки =====
    function bindUI() {
        dom.btnMarathon.addEventListener("click",()=>{ if(selectedMenuMode==='blast') startBlast(); else startMarathon(); });
        dom.btnLevels.addEventListener("click",()=>{ renderLevelGrid(); showOverlay(dom.overlayLevelSelect); });
        dom.modeCardClassic.addEventListener("click",()=>setMenuMode('classic'));
        dom.modeCardBlast.addEventListener("click",()=>setMenuMode('blast'));
        dom.btnBlastMenu.addEventListener("click",()=>{ BlastGame.over=true; SDK.gameplayStop(); renderStreakBadge(); renderLevelGrid(); showOverlay(dom.overlayMenu); });
        dom.btnBlastDoubleScore.addEventListener("click",()=>tryBlastDoubleScore());
        dom.btnBlastRetry.addEventListener("click",()=>startBlast());
        dom.btnBlastGoMenu.addEventListener("click",()=>{ renderStreakBadge(); renderLevelGrid(); showOverlay(dom.overlayMenu); });
        dom.btnLeaderboard.addEventListener("click",()=>showLeaderboard(dom.overlayMenu));
        dom.btnOpenSettings.addEventListener("click",()=>{
            applyTheme(document.documentElement.dataset.theme||'neon');
            showOverlay(dom.overlaySettings);
        });
        dom.btnLevelBack.addEventListener("click",()=>showOverlay(dom.overlayMenu));
        dom.btnResume.addEventListener("click",()=>resumeGame());
        dom.btnRestartFromPause.addEventListener("click",()=>{ if(gameMode==="level") startLevel(currentCampaignLevel); else startMarathon(); });
        dom.btnPauseLeaderboard.addEventListener("click",()=>showLeaderboard(dom.overlayPause));
        dom.btnPauseMenu.addEventListener("click",()=>goToMenu());
        dom.btnPause.addEventListener("click",()=>togglePause());
        dom.btnNextLevel.addEventListener("click",()=>{ const n=currentCampaignLevel+1; if(n<=LEVEL_DEFS.length) startLevel(n); });
        dom.btnRetryLevel.addEventListener("click",()=>startLevel(currentCampaignLevel));
        dom.btnToMenuFromLC.addEventListener("click",()=>{ renderStreakBadge(); renderLevelGrid(); showOverlay(dom.overlayMenu); });
        dom.btnRetry.addEventListener("click",()=>{ if(gameMode==="level") startLevel(currentCampaignLevel); else startMarathon(); });
        dom.btnRevive.addEventListener("click",()=>tryRevive());
        dom.btnDoubleScore.addEventListener("click",()=>tryDoubleScore());
        dom.btnGOLeaderboard.addEventListener("click",()=>showLeaderboard(dom.overlayGameOver));
        dom.btnGoMenu.addEventListener("click",()=>{ renderStreakBadge(); renderLevelGrid(); showOverlay(dom.overlayMenu); });
        dom.btnLbClose.addEventListener("click",()=>{ const el=lbReturnEl||dom.overlayMenu; lbReturnEl=null; showOverlay(el); });
        dom.btnResetSettings.addEventListener("click",()=>{
            applyTheme('neon');
            Audio.setMuted(false); syncMuteButtons();
            I18N.set('ru'); syncLangButtons();
            InputPrefs.setControlMode('gesture');
            if (input) input.applyControlMode();
            syncCtrlMode();
            showToast(I18N.t('reset_settings'), { duration: 1200 });
        });
        dom.btnSettingsClose.addEventListener("click",()=>showOverlay(dom.overlayMenu));
        // Theme cards
        [dom.themeNeon,dom.themeMinimal,dom.themeWood,dom.themeRetro].forEach(btn=>{
            if (!btn) return;
            btn.addEventListener("click",()=>applyTheme(btn.dataset.themeSelect));
        });
        // Mute — все три кнопки
        function onMuteClick() { Audio.toggle(); syncMuteButtons(); }
        dom.btnMute.addEventListener("click",onMuteClick);
        dom.btnMuteMenu.addEventListener("click",onMuteClick);
        dom.btnMuteSettings.addEventListener("click",onMuteClick);
        // Lang — все три кнопки
        function onLangClick() { I18N.cycle(); syncLangButtons(); renderStreakBadge(); renderLevelGrid(); }
        dom.btnLang.addEventListener("click",onLangClick);
        dom.btnLangMenu.addEventListener("click",onLangClick);
        dom.btnLangSettings.addEventListener("click",onLangClick);
        // Control mode
        if (dom.ctrlGesture) dom.ctrlGesture.addEventListener("click",()=>{
            InputPrefs.setControlMode("gesture");
            if (input) input.applyControlMode();
            syncCtrlMode();
        });
        if (dom.ctrlButtons) dom.ctrlButtons.addEventListener("click",()=>{
            InputPrefs.setControlMode("buttons");
            if (input) input.applyControlMode();
            syncCtrlMode();
        });
        document.addEventListener("visibilitychange",()=>{ if(document.hidden&&game&&game.state==="running"&&!advPaused) pauseGame(); });
        window.addEventListener("blur",()=>{ if(game&&game.state==="running"&&!advPaused) pauseGame(); });
    }

    function applyControlHint() {
        dom.controlsHint.textContent = I18N.t(SDK.isMobile() ? "hint_touch" : "hint_desktop");
        dom.controlsHint.hidden = (selectedMenuMode === 'blast');
    }

    // ===== Загрузка =====
    async function bootstrap() {
        Audio.init();
        // Apply saved theme immediately
        applyTheme(loadTheme());

        const sdkPromise=SDK.init();
        const ysdk=await Promise.race([sdkPromise, new Promise(r=>setTimeout(()=>r(null),2500))]);

        I18N.init(SDK.lang);
        I18N.onChange(()=>{ applyControlHint(); syncLangButtons(); });

        await Storage.init(SDK.ready?SDK:null);

        SDK.setAdvHandlers(
            ()=>{ advPaused=true; SDK.hideBannerAdv(); if(game&&game.state==="running") game.pause(); },
            ()=>{ advPaused=false; if(SDK.ready&&!SDK.isMobile()) SDK.showBannerAdv(); },
        );

        syncMuteButtons();
        syncLangButtons();

        game=new Tetris();
        renderer=new Renderer(game, { boardCanvas:dom.board, holdCanvas:dom.hold, nextCanvas:dom.next, playfield:dom.playfield });
        input=new Input(game, { audio:Audio, playfield:dom.playfield, touchpad:dom.touchpad, onPauseToggle:togglePause, onUnlock:()=>Audio.unlock() });

        MenuBg.init($("menuBg"));
        BlastGame.init(dom.blastCanvas, [dom.blastSlot0, dom.blastSlot1, dom.blastSlot2], dom.blastField);
        window.addEventListener('resize', () => { if (dom.overlayBlast.classList.contains('overlay--active')) BlastGame.resize(); });

        bindGameEvents();
        bindUI();
        applyControlHint();

        syncCtrlMode();
        setMenuMode(selectedMenuMode);
        renderLevelGrid();
        renderStreakBadge();

        if (ysdk===null) await sdkPromise.catch(()=>null);
        SDK.notifyLoaded();

        if (SDK.ready&&!SDK.isMobile()) SDK.showBannerAdv();

        showOverlay(dom.overlayMenu);

        requestAnimationFrame(t=>{ lastFrame=t; loop(t); });
        requestAnimationFrame(()=>{ dom.boot.classList.add("boot--hidden"); setTimeout(()=>dom.boot.remove(),500); });
    }

    if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",bootstrap);
    else bootstrap();
})();
