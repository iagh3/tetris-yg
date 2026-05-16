/**
 * Лёгкий синтезированный звук через WebAudio. Ни байта внешних ресурсов.
 * Поддерживает mute с сохранением выбора и автозапуск после первого жеста.
 */
(function (root) {
    "use strict";

    const MUTE_KEY = "tetris.muted";

    const Audio = {
        ctx: null,
        master: null,
        muted: false,
        _unlocked: false,

        init() {
            try {
                this.muted = localStorage.getItem(MUTE_KEY) === "1";
            } catch (_) {}
        },

        _ensure() {
            if (this.ctx) return;
            const Ctor = root.AudioContext || root.webkitAudioContext;
            if (!Ctor) return;
            this.ctx = new Ctor();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.muted ? 0 : 0.6;
            this.master.connect(this.ctx.destination);
        },

        /** Разблокировка после первого пользовательского взаимодействия. */
        unlock() {
            this._ensure();
            if (!this.ctx) return;
            if (this.ctx.state === "suspended") {
                this.ctx.resume().catch(() => {});
            }
            this._unlocked = true;
        },

        setMuted(m) {
            this.muted = !!m;
            try {
                localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0");
            } catch (_) {}
            if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
        },

        toggle() {
            this.setMuted(!this.muted);
            return this.muted;
        },

        _tone(freq, dur, type = "sine", vol = 0.18, attack = 0.005) {
            if (this.muted || !this.ctx) return;
            const t0 = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(vol, t0 + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        },

        _sweep(fromHz, toHz, dur, type = "sawtooth", vol = 0.15) {
            if (this.muted || !this.ctx) return;
            const t0 = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(fromHz, t0);
            osc.frequency.exponentialRampToValueAtTime(
                Math.max(1, toHz),
                t0 + dur,
            );
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        },

        move() {
            this._tone(220, 0.04, "square", 0.06);
        },
        rotate() {
            this._tone(380, 0.07, "triangle", 0.09);
        },
        hold() {
            this._tone(520, 0.08, "sine", 0.1);
        },
        softDrop() {
            this._tone(140, 0.03, "square", 0.05);
        },
        hardDrop() {
            this._sweep(180, 60, 0.12, "sawtooth", 0.16);
        },
        lock() {
            this._tone(110, 0.05, "triangle", 0.08);
        },
        clear(n) {
            const base = 440;
            for (let i = 0; i < n; i++) {
                setTimeout(
                    () =>
                        this._tone(
                            base * Math.pow(1.122, i),
                            0.18,
                            "triangle",
                            0.14,
                        ),
                    i * 55,
                );
            }
        },
        tspin() {
            this._sweep(300, 900, 0.25, "sine", 0.16);
            setTimeout(() => this._tone(880, 0.12, "triangle", 0.12), 120);
        },
        perfectClear() {
            [523, 659, 784, 1047].forEach((f, i) =>
                setTimeout(() => this._tone(f, 0.22, "sine", 0.16), i * 80),
            );
        },
        levelUp() {
            [392, 523, 659].forEach((f, i) =>
                setTimeout(() => this._tone(f, 0.18, "triangle", 0.14), i * 70),
            );
        },
        gameOver() {
            this._sweep(440, 80, 0.8, "sawtooth", 0.2);
        },
    };

    root.Audio = Audio;
})(window);
