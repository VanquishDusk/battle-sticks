'use strict';
/* =========================================================
   Sound: every effect and both music tracks are synthesized
   with the WebAudio API, so the game ships with no audio files.
   ========================================================= */

const Sound = (() => {
  let ctx = null, master, sfxBus, musicBus, noiseBuf;
  const st = { sfx: true, music: true };
  const last = {};
  let musicName = null, musicTimer = null, step = 0, nextT = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0.85;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = st.sfx ? 0.6 : 0; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = st.music ? 0.2 : 0; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    if (musicName) startMusic(musicName, true);
  }

  // ---------- primitives ----------
  function tone(freq, dur, o = {}) {
    const t0 = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    const vol = o.vol == null ? 0.3 : o.vol, att = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function noise(dur, o = {}) {
    const t0 = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1000, t0);
    if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain(), vol = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
  }
  const notes = (seq, o) => seq.forEach(([f, d, delay]) => tone(f, d, Object.assign({}, o, { delay })));

  // ---------- effects ----------
  const SFX = {
    click() { tone(900, 0.05, { type: 'square', vol: 0.06 }); },
    summon() { tone(380 + Math.random() * 60, 0.1, { type: 'triangle', vol: 0.22, slide: 820 }); tone(640, 0.13, { vol: 0.12, slide: 1280, delay: 0.06 }); },
    hit() { noise(0.07, { vol: 0.3, freq: 1700, q: 0.8 }); tone(170, 0.08, { vol: 0.3, slide: 70 }); },
    punch() { noise(0.06, { vol: 0.35, type: 'lowpass', freq: 900 }); tone(130, 0.11, { vol: 0.45, slide: 50 }); },
    slash() { noise(0.1, { vol: 0.2, type: 'highpass', freq: 2500, slide: 6000 }); tone(240, 0.06, { vol: 0.15, slide: 120 }); },
    clang() { tone(1250, 0.12, { type: 'square', vol: 0.05, slide: 900 }); noise(0.06, { vol: 0.2, freq: 3200, q: 3 }); },
    heavy() { tone(95, 0.38, { vol: 0.7, slide: 34 }); noise(0.32, { vol: 0.45, type: 'lowpass', freq: 700, slide: 80 }); },
    arrow() { noise(0.14, { vol: 0.13, freq: 3200, slide: 900, q: 2 }); },
    throw() { noise(0.13, { vol: 0.12, freq: 1300, slide: 500, q: 1.5 }); },
    magic() { tone(620, 0.25, { vol: 0.12, slide: 1300 }); tone(930, 0.22, { type: 'triangle', vol: 0.08, delay: 0.05, slide: 1900 }); },
    hex() { tone(300, 0.25, { type: 'sawtooth', vol: 0.05, slide: 600 }); tone(450, 0.2, { vol: 0.07, delay: 0.04, slide: 220 }); },
    explode() { noise(0.7, { vol: 0.6, type: 'lowpass', freq: 1300, slide: 60 }); tone(110, 0.5, { vol: 0.5, slide: 30 }); },
    thunder() {
      noise(0.16, { vol: 0.7, type: 'highpass', freq: 1800 });
      noise(1.3, { vol: 0.55, type: 'lowpass', freq: 520, slide: 40, delay: 0.05 });
      tone(62, 0.9, { vol: 0.45, slide: 28 });
    },
    death() { tone(520, 0.24, { type: 'triangle', vol: 0.1, slide: 180 }); },
    edeath() { tone(320, 0.18, { type: 'square', vol: 0.04, slide: 90 }); noise(0.12, { vol: 0.1, type: 'lowpass', freq: 600 }); },
    coin() { tone(1046, 0.06, { type: 'square', vol: 0.045 }); tone(1568, 0.14, { type: 'square', vol: 0.045, delay: 0.06 }); },
    upgrade() { notes([[523, 0.12, 0], [659, 0.12, 0.07], [784, 0.12, 0.14], [1046, 0.25, 0.21]], { type: 'triangle', vol: 0.2 }); },
    error() { tone(160, 0.09, { type: 'square', vol: 0.09 }); tone(120, 0.12, { type: 'square', vol: 0.09, delay: 0.1 }); },
    basehit() { tone(72, 0.25, { vol: 0.45, slide: 40 }); noise(0.25, { vol: 0.28, type: 'lowpass', freq: 420 }); },
    heal() { notes([[784, 0.18, 0], [988, 0.18, 0.06], [1175, 0.25, 0.12]], { vol: 0.09 }); },
    kb() { tone(260, 0.16, { type: 'triangle', vol: 0.1, slide: 520 }); },
    boss() {
      tone(110, 1.3, { type: 'sawtooth', vol: 0.2, slide: 82, attack: 0.05 });
      tone(55, 1.5, { vol: 0.45, attack: 0.05 });
      noise(0.6, { vol: 0.3, type: 'lowpass', freq: 300 });
      tone(147, 0.9, { type: 'sawtooth', vol: 0.12, delay: 0.45, slide: 110 });
    },
    wave() { tone(392, 0.12, { type: 'square', vol: 0.08 }); tone(523, 0.28, { type: 'square', vol: 0.08, delay: 0.12 }); noise(0.15, { vol: 0.2, type: 'lowpass', freq: 400 }); },
    ready() { tone(1318, 0.1, { vol: 0.1 }); tone(1760, 0.22, { vol: 0.1, delay: 0.08 }); },
    victory() {
      notes([[523, 0.14, 0], [659, 0.14, 0.13], [784, 0.14, 0.26], [1046, 0.3, 0.39], [784, 0.14, 0.62], [1046, 0.6, 0.75]], { type: 'square', vol: 0.09 });
      notes([[262, 0.4, 0], [392, 0.4, 0.39], [523, 0.8, 0.75]], { type: 'triangle', vol: 0.2 });
    },
    defeat() {
      notes([[392, 0.3, 0], [370, 0.3, 0.3], [349, 0.3, 0.6], [330, 0.9, 0.9]], { type: 'triangle', vol: 0.2 });
      notes([[196, 0.6, 0], [175, 1.2, 0.6]], { type: 'sine', vol: 0.18 });
    },
    star() { tone(1200, 0.12, { type: 'triangle', vol: 0.12, slide: 1800 }); },
    drum() { tone(110, 0.14, { vol: 0.35, slide: 70 }); noise(0.08, { vol: 0.12, type: 'lowpass', freq: 500 }); tone(160, 0.1, { vol: 0.2, slide: 90, delay: 0.16 }); },
    build() { [0, 0.12, 0.24].forEach(d => { tone(300, 0.06, { type: 'square', vol: 0.06, slide: 180, delay: d }); noise(0.05, { vol: 0.15, freq: 1200, delay: d }); }); },
    paint() { noise(0.3, { vol: 0.15, freq: 900, slide: 2400, q: 1.2 }); tone(500, 0.2, { vol: 0.06, slide: 900, delay: 0.1 }); },
    chrono() { [0, 0.1, 0.2, 0.3].forEach((d, i) => tone(i % 2 ? 1800 : 1400, 0.05, { type: 'square', vol: 0.05, delay: d })); tone(900, 0.6, { vol: 0.12, slide: 220, delay: 0.1 }); },
    erase() { noise(0.12, { vol: 0.25, freq: 2600, slide: 900, q: 3 }); tone(700, 0.1, { type: 'triangle', vol: 0.1, slide: 1300 }); },
    shield() { tone(520, 0.3, { type: 'triangle', vol: 0.12, slide: 1040 }); tone(780, 0.35, { vol: 0.08, delay: 0.08, slide: 1560 }); },
    moon() { notes([[880, 0.3, 0], [1175, 0.3, 0.1], [1568, 0.5, 0.2]], { vol: 0.07 }); noise(0.4, { vol: 0.08, freq: 3000, slide: 1200, q: 4 }); },
    roar() { tone(150, 0.5, { type: 'sawtooth', vol: 0.18, slide: 70, attack: 0.03 }); noise(0.45, { vol: 0.25, type: 'lowpass', freq: 700, slide: 150 }); },
    tide() { noise(0.9, { vol: 0.3, type: 'lowpass', freq: 500, slide: 2400, attack: 0.15 }); noise(0.6, { vol: 0.12, freq: 3500, q: 1, delay: 0.25 }); },
    dream() { notes([[1046, 0.25, 0], [1318, 0.25, 0.08], [1568, 0.25, 0.16], [2093, 0.4, 0.24]], { type: 'sine', vol: 0.06 }); },
    zwheel() { tone(1900, 0.03, { type: 'square', vol: 0.035 }); },
    zstar() { tone(1568 + Math.random() * 600, 0.35, { vol: 0.07 }); },
    zglyph() { notes([[392, 0.9, 0], [494, 0.9, 0], [587, 0.9, 0], [784, 1.1, 0.05]], { type: 'triangle', vol: 0.08, attack: 0.12 }); noise(0.8, { vol: 0.12, freq: 800, slide: 4000, q: 1.5, attack: 0.3 }); },
    gpurity() {
      notes([[523, 1.6, 0], [659, 1.6, 0.05], [784, 1.6, 0.1], [988, 1.6, 0.15], [1318, 1.8, 0.2], [1976, 2, 0.3]], { type: 'sine', vol: 0.06, attack: 0.25 });
      tone(55, 1.8, { vol: 0.4, attack: 0.2 }); noise(1.6, { vol: 0.15, freq: 6000, slide: 300, q: 2, attack: 0.4 });
    },
    gcharge() { tone(160, 1.3, { type: 'triangle', vol: 0.12, slide: 880, attack: 0.3 }); noise(1.3, { vol: 0.07, freq: 400, slide: 3200, q: 2, attack: 0.5 }); },
    ghint() { tone(700, 0.14, { type: 'square', vol: 0.06, slide: 1400 }); tone(1400, 0.2, { vol: 0.06, delay: 0.05 }); },
    greveal0() { notes([[523, 0.14, 0], [784, 0.3, 0.08]], { type: 'triangle', vol: 0.16 }); noise(0.25, { vol: 0.15, type: 'lowpass', freq: 900 }); },
    greveal1() { notes([[523, 0.12, 0], [659, 0.12, 0.07], [784, 0.35, 0.14]], { type: 'triangle', vol: 0.18 }); noise(0.3, { vol: 0.2, type: 'lowpass', freq: 1200 }); },
    greveal2() { notes([[587, 0.12, 0], [740, 0.12, 0.07], [880, 0.12, 0.14], [1175, 0.45, 0.21]], { type: 'square', vol: 0.07 }); noise(0.4, { vol: 0.3, type: 'lowpass', freq: 1500, slide: 200 }); },
    greveal3() {
      notes([[523, 0.1, 0], [659, 0.1, 0.06], [784, 0.1, 0.12], [1046, 0.1, 0.18], [1318, 0.6, 0.24]], { type: 'square', vol: 0.08 });
      tone(130, 0.6, { vol: 0.4, slide: 60 }); noise(0.6, { vol: 0.35, type: 'lowpass', freq: 2000, slide: 100 });
    },
    greveal4() {
      notes([[523, 0.14, 0], [659, 0.14, 0.12], [784, 0.14, 0.24], [1046, 0.3, 0.36], [784, 0.14, 0.6], [1046, 0.8, 0.72]], { type: 'square', vol: 0.09 });
      notes([[1568, 0.5, 0.4], [2093, 0.6, 0.55], [2637, 0.8, 0.7]], { vol: 0.05 });
      tone(65, 1.2, { vol: 0.5, slide: 40 }); noise(1, { vol: 0.4, type: 'lowpass', freq: 2500, slide: 80 });
    },
    unlock() { notes([[659, 0.1, 0], [784, 0.1, 0.08], [988, 0.1, 0.16], [1318, 0.4, 0.24]], { type: 'square', vol: 0.07 }); },
  };

  function play(name, minGap = 0.035) {
    if (!ctx || !st.sfx || !SFX[name]) return;
    const now = ctx.currentTime;
    if (last[name] != null && now - last[name] < minGap) return;
    last[name] = now;
    try { SFX[name](); } catch (e) { /* ignore */ }
  }

  // ---------- music (tiny step sequencer) ----------
  const m = n => 440 * Math.pow(2, (n - 69) / 12);
  const TRACKS = {
    battle: {
      bpm: 132,
      chords: [45, 41, 48, 43],    // Am F C G (bass roots)
      lead: [
        [69, 0, 72, 76, 0, 74, 72, 71], [69, 0, 65, 69, 72, 0, 71, 69],
        [67, 0, 72, 76, 79, 0, 76, 74], [71, 0, 74, 79, 0, 77, 76, 74],
      ],
      drums: true,
    },
    menu: {
      bpm: 96,
      chords: [48, 45, 41, 43],    // C Am F G
      arp: [[0, 4, 7, 12], [0, 3, 7, 12], [0, 4, 7, 12], [0, 4, 7, 11]],
      drums: false,
    },
  };

  function scheduleStep(tr, s, t) {
    const bar = Math.floor(s / 8) % 4, e = s % 8, dur = 60 / tr.bpm / 2;
    const root = tr.chords[bar];
    const o = { bus: musicBus };
    if (tr.lead) {
      // bass: root on beats, octave on offbeats
      tone(m(e % 2 ? root + 12 : root), dur * 0.9, Object.assign({ type: 'triangle', vol: 0.32, delay: t - ctx.currentTime }, o));
      const n = tr.lead[bar][e];
      const loopVar = Math.floor(s / 32) % 2;
      if (n && !(loopVar && e === 7)) tone(m(n), dur * 0.85, Object.assign({ type: 'square', vol: 0.07, delay: t - ctx.currentTime }, o));
    } else {
      const arp = tr.arp[bar];
      tone(m(root + 24 + arp[e % 4]), dur * 1.6, Object.assign({ type: 'sine', vol: 0.12, delay: t - ctx.currentTime, attack: 0.02 }, o));
      if (e === 0) tone(m(root + 12), dur * 7.5, Object.assign({ type: 'triangle', vol: 0.18, delay: t - ctx.currentTime, attack: 0.05 }, o));
    }
    if (tr.drums) {
      const d = t - ctx.currentTime;
      if (e === 0 || e === 4) tone(140, 0.12, { vol: 0.5, slide: 45, delay: d, bus: musicBus });
      if (e === 2 || e === 6) noise(0.12, { vol: 0.22, freq: 1800, q: 0.7, delay: d, bus: musicBus });
      noise(0.03, { vol: 0.07, type: 'highpass', freq: 7000, delay: d, bus: musicBus });
    }
  }

  function startMusic(name, force) {
    if (musicName === name && !force && musicTimer) return;
    stopMusic();
    musicName = name;
    if (!ctx) return;
    const tr = TRACKS[name];
    step = 0; nextT = ctx.currentTime + 0.1;
    musicTimer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      const dur = 60 / tr.bpm / 2;
      while (nextT < ctx.currentTime + 0.2) {
        if (st.music) scheduleStep(tr, step, nextT);
        step++; nextT += dur;
      }
      if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    }, 60);
  }
  function stopMusic() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null; musicName = null;
  }

  function setSfx(on) { st.sfx = on; if (sfxBus) sfxBus.gain.value = on ? 0.6 : 0; }
  function setMusic(on) { st.music = on; if (musicBus) musicBus.gain.value = on ? 0.2 : 0; }

  return { init, play, startMusic, stopMusic, setSfx, setMusic, get ready() { return !!ctx; } };
})();
