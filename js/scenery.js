'use strict';
/* =========================================================
   Scenery: themed parallax backgrounds, weather, clouds,
   the two bases (player tower / enemy fortress / portal)
   and the world-map backdrop.
   Static layers are pre-rendered into offscreen canvases.
   ========================================================= */

const VIEW_W = 1280, VIEW_H = 720;
const GROUND_Y = 494;      // feet of units on the back lane
const LANE_H = 22;         // lane depth (units spread over GROUND_Y..GROUND_Y+LANE_H)
const BASE_GY = 512;       // bottom of the bases
const PAR_FAR = 0.22, PAR_MID = 0.5, PAR_CLOUD = 0.08;
const FAR_Y = 140, FAR_H = 340, MID_Y = 290, MID_H = 200, GR_Y = 456, GR_H = VIEW_H - 456;

const THEMES = {
  meadow: {
    sky: ['#56b4ff', '#a9dcff', '#e4f6ff'], sun: '#fff6c2', far: ['#9db0d8', '#7f95c4'], cap: '#ffffff', farShape: 'peaks',
    mid: ['#7ccb54', '#63b440'], ground: '#8dd162', groundDark: '#6fb247', path: '#ecd59d', pathDark: '#d8bd80', grass: '#4f9a31',
    decor: ['tree', 'tree', 'bush'], cloud: '#ffffff', weather: null, outline: 'rgba(40,70,30,.55)',
  },
  desert: {
    sky: ['#ff9f4a', '#ffcf8f', '#fff0cf'], sun: '#fffbe6', far: ['#e7a073', '#cf8257'], farShape: 'mesa',
    mid: ['#efc27a', '#e2ae62'], ground: '#f3d394', groundDark: '#dfb66d', path: '#e6bd7c', pathDark: '#cfa05e', grass: '#b48a45',
    decor: ['cactus', 'cactus', 'rock', 'pyramid'], cloud: '#fff4e2', weather: 'dust', outline: 'rgba(110,60,20,.45)',
  },
  snow: {
    sky: ['#7fb2e3', '#c2dcf5', '#f0f7ff'], sun: '#ffffff', far: ['#b7c9e2', '#94abcf'], cap: '#ffffff', farShape: 'jag',
    mid: ['#eaf2fb', '#d3e2f2'], ground: '#f3f8fe', groundDark: '#cddcee', path: '#dfe8f3', pathDark: '#b7c8dc', grass: '#a9bfd8',
    decor: ['pine', 'pine', 'rock'], cloud: '#ffffff', weather: 'snow', outline: 'rgba(40,60,90,.45)',
  },
  volcano: {
    sky: ['#2a1022', '#7a2525', '#e0622a'], sun: null, far: ['#3b2027', '#2a161c'], farShape: 'volcano',
    mid: ['#45302d', '#36241f'], ground: '#56423b', groundDark: '#3d2d27', path: '#715649', pathDark: '#5b4339', grass: '#2e211c',
    decor: ['deadtree', 'rock', 'deadtree'], cloud: '#5b3a40', weather: 'ember', outline: 'rgba(0,0,0,.5)', lava: '#ff7a1a',
  },
  night: {
    sky: ['#0d1033', '#272766', '#5a3f8c'], sun: null, moon: true, stars: true, far: ['#2b2a5c', '#211f48'], farShape: 'peaks', cap: '#6d6aa8',
    mid: ['#2d3b63', '#243052'], ground: '#3d4c70', groundDark: '#2c3856', path: '#58628a', pathDark: '#465073', grass: '#26304d',
    decor: ['crystal', 'pine', 'crystal'], cloud: '#3c3b72', weather: 'firefly', outline: 'rgba(0,0,0,.45)',
  },
};

const Scenery = (() => {
  const OUT = '#2b2118';
  const DECOR = {}, WEATHER = {};

  function mk(w, h, res) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * res)); c.height = Math.max(1, Math.ceil(h * res));
    const x = c.getContext('2d'); x.scale(res, res);
    x.lineJoin = 'round'; x.lineCap = 'round';
    return { c, x, w, h };
  }

  // ---------- decor props ----------
  function decor(ctx, kind, x, y, s, rng, th) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = th.outline; ctx.lineWidth = 3;
    switch (kind) {
      case 'tree': {
        ctx.fillStyle = '#8a5a34'; ctx.fillRect(-5, -40, 10, 40); ctx.strokeRect(-5, -40, 10, 40);
        const g = ['#58b13c', '#4aa133', '#6cc84b'];
        const blobs = [[-18, -52, 20], [16, -55, 21], [0, -72, 25], [-6, -48, 18]];
        for (const [bx, by, r] of blobs) { ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fillStyle = g[0]; ctx.fill(); ctx.stroke(); }
        for (const [bx, by, r] of blobs) { ctx.beginPath(); ctx.arc(bx, by, r - 1.5, 0, TAU); ctx.fillStyle = g[0]; ctx.fill(); }
        ctx.beginPath(); ctx.arc(-4, -78, 12, 0, TAU); ctx.fillStyle = g[2]; ctx.fill();
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-20 + rng() * 40, -80 + rng() * 40, 3.2, 0, TAU); ctx.fillStyle = '#ef4444'; ctx.fill(); }
        break;
      }
      case 'bush': {
        for (const [bx, by, r] of [[-14, -10, 12], [0, -16, 15], [14, -10, 12]]) { ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fillStyle = '#4caf3a'; ctx.fill(); ctx.stroke(); }
        for (const [bx, by, r] of [[-14, -10, 10.5], [0, -16, 13.5], [14, -10, 10.5]]) { ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fillStyle = '#4caf3a'; ctx.fill(); }
        ctx.beginPath(); ctx.arc(-3, -21, 5, 0, TAU); ctx.fillStyle = '#74d054'; ctx.fill();
        break;
      }
      case 'cactus': {
        ctx.fillStyle = '#4c9a3a';
        const arm = (ax, ay, w, h, dir) => {
          U.rrect(ctx, ax, ay - h, w, h, w / 2); ctx.fill(); ctx.stroke();
        };
        arm(-8, 0, 16, 62, 0);
        arm(-24, -22, 12, 26, 0); ctx.fillRect(-16, -28, 10, 8);
        arm(12, -30, 12, 22, 0); ctx.fillRect(6, -36, 10, 8);
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-2, -54); ctx.stroke();
        break;
      }
      case 'pyramid': {
        ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(0, -80); ctx.lineTo(70, 0); ctx.closePath();
        ctx.fillStyle = '#e8b96c'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(70, 0); ctx.lineTo(14, 0); ctx.closePath(); ctx.fillStyle = '#cf9a52'; ctx.fill();
        ctx.strokeStyle = 'rgba(120,70,20,.35)'; ctx.lineWidth = 1.5;
        for (let i = 1; i < 5; i++) { const yy = -i * 16; const hw = 70 - i * 14; ctx.beginPath(); ctx.moveTo(-hw, yy); ctx.lineTo(hw, yy); ctx.stroke(); }
        break;
      }
      case 'rock': {
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-14, -14); ctx.lineTo(-2, -20); ctx.lineTo(12, -15); ctx.lineTo(18, 0); ctx.closePath();
        ctx.fillStyle = th === THEMES.volcano ? '#4a3530' : th === THEMES.snow ? '#a3b3c7' : '#b9a58a'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-2, -17); ctx.lineTo(6, -13); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
        break;
      }
      case 'pine': {
        ctx.fillStyle = '#6b4a2e'; ctx.fillRect(-4, -16, 8, 16);
        const layers = [[0, -16, 30, 34], [0, -36, 24, 30], [0, -54, 17, 26]];
        for (const [lx, ly, w, h] of layers) {
          ctx.beginPath(); ctx.moveTo(lx - w, ly); ctx.lineTo(lx, ly - h); ctx.lineTo(lx + w, ly); ctx.closePath();
          ctx.fillStyle = th.pine || (th === THEMES.night ? '#1f3a4a' : '#2f6b4f'); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lx - w * 0.45, ly - h * 0.55); ctx.lineTo(lx, ly - h); ctx.lineTo(lx + w * 0.45, ly - h * 0.55);
          ctx.quadraticCurveTo(lx, ly - h * 0.42, lx - w * 0.45, ly - h * 0.55);
          ctx.fillStyle = th.pineCap || (th === THEMES.night ? '#8c8cd0' : '#ffffff'); ctx.fill();
        }
        break;
      }
      case 'deadtree': {
        ctx.strokeStyle = '#1d1412'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, -46); ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(1, -26); ctx.lineTo(-16, -44); ctx.lineTo(-22, -42); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, -36); ctx.lineTo(18, -54); ctx.lineTo(24, -54); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, -46); ctx.lineTo(-4, -62); ctx.stroke();
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, -38); ctx.lineTo(-10, -50); ctx.stroke();
        break;
      }
      case 'crystal': {
        const cols = ['#a78bfa', '#67e8f9', '#f0abfc'];
        const col = cols[(rng() * 3) | 0];
        for (const [cx, h, w, a] of [[-10, 34, 8, -0.25], [0, 50, 10, 0], [11, 28, 7, 0.3]]) {
          ctx.save(); ctx.translate(cx, 0); ctx.rotate(a);
          ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w, -h * 0.75); ctx.lineTo(w, 0); ctx.closePath();
          ctx.fillStyle = col; ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-w * 0.4, -h * 0.1); ctx.lineTo(-w * 0.4, -h * 0.7); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore(); ctx.strokeStyle = th.outline; ctx.lineWidth = 3;
        }
        break;
      }
      default:
        if (DECOR[kind]) DECOR[kind](ctx, rng, th);
    }
    ctx.restore();
  }

  // ---------- far mountains ----------
  function farLayer(L, th, rng) {
    const ctx = L.x, w = L.w, h = L.h;
    const base = h - 6;
    const rows = [
      { col: th.far[0], amp: 150, min: 90, step: [110, 190], y: base },
      { col: th.far[1], amp: 110, min: 50, step: [90, 160], y: base + 4 },
    ];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const pts = [];
      let x = -60 - rng() * 60;
      while (x < w + 160) {
        const ph = row.min + rng() * row.amp;
        pts.push([x, row.y - ph]);
        x += row.step[0] + rng() * (row.step[1] - row.step[0]);
      }
      ctx.beginPath(); ctx.moveTo(-100, h);
      if (th.farShape === 'mesa') {
        for (const [px, py] of pts) { const hw = 30 + rng() * 40; ctx.lineTo(px - hw - 20, row.y - 10); ctx.lineTo(px - hw, py); ctx.lineTo(px + hw, py); ctx.lineTo(px + hw + 22, row.y - 10); }
      } else if (th.farShape === 'volcano') {
        for (const [px, py] of pts) { const hw = 16 + rng() * 14; ctx.lineTo(px - 120, row.y); ctx.lineTo(px - hw, py); ctx.lineTo(px + hw, py); ctx.lineTo(px + 120, row.y); }
      } else if (th.farShape === 'jag') {
        let px0 = -100;
        for (const [px, py] of pts) { const mx = (px0 + px) / 2; ctx.lineTo(mx, row.y - 30 - rng() * 30); ctx.lineTo(px - 12, py + 14); ctx.lineTo(px, py); ctx.lineTo(px + 8, py + 10); px0 = px; }
      } else {
        let px0 = -100;
        for (const [px, py] of pts) { const mx = (px0 + px) / 2; ctx.quadraticCurveTo(mx, row.y - 10, px, py); px0 = px; }
      }
      ctx.lineTo(w + 200, h); ctx.closePath();
      ctx.fillStyle = row.col; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 3; ctx.stroke();

      // caps / lava
      for (const [px, py] of pts) {
        if (th.cap && th.farShape !== 'mesa') {
          ctx.beginPath();
          const cw = th.farShape === 'jag' ? 16 : 22;
          ctx.moveTo(px - cw, py + 22); ctx.lineTo(px, py); ctx.lineTo(px + cw, py + 22);
          ctx.lineTo(px + cw * 0.5, py + 17); ctx.lineTo(px + 2, py + 25); ctx.lineTo(px - cw * 0.5, py + 17); ctx.closePath();
          ctx.fillStyle = th.cap; ctx.globalAlpha = r === 0 ? 0.85 : 1; ctx.fill(); ctx.globalAlpha = 1;
        }
        if (th.farShape === 'volcano') {
          const g = ctx.createRadialGradient(px, py, 2, px, py, 70);
          g.addColorStop(0, 'rgba(255,140,40,.75)'); g.addColorStop(1, 'rgba(255,80,20,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 70, 0, TAU); ctx.fill();
          ctx.strokeStyle = th.lava; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(px - 6, py + 2); ctx.lineTo(px - 14, py + 30); ctx.lineTo(px - 10, py + 50); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px + 6, py + 2); ctx.lineTo(px + 18, py + 40); ctx.stroke();
        }
      }
    }
    if (th.farShape === 'mesa') { // a couple of distant pyramids
      for (let i = 0; i < Math.ceil(w / 700); i++) decor(ctx, 'pyramid', 200 + i * 700 + rng() * 200, base + 4, 0.9 + rng() * 0.4, rng, th);
    }
    if (th.farExtra) th.farExtra(ctx, w, h, rng);
  }

  // ---------- mid hills ----------
  function midLayer(L, th, rng) {
    const ctx = L.x, w = L.w, h = L.h;
    const hill = (yBase, amp, col, f1, f2, ph) => {
      ctx.beginPath(); ctx.moveTo(-10, h);
      for (let x = -10; x <= w + 10; x += 12) ctx.lineTo(x, yBase - amp * (0.5 + 0.3 * Math.sin(x * f1 + ph) + 0.2 * Math.sin(x * f2 + ph * 2)));
      ctx.lineTo(w + 10, h); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = th.outline; ctx.globalAlpha = 0.5; ctx.lineWidth = 2.5; ctx.stroke(); ctx.globalAlpha = 1;
    };
    hill(h - 40, 80, th.mid[0], 0.006, 0.017, rng() * 6);
    // decor on the hill line
    let x = 40 + rng() * 80;
    while (x < w) {
      const kind = th.decor[(rng() * th.decor.length) | 0];
      const yy = h - 40 - 80 * (0.5 + 0.3 * Math.sin(x * 0.006) + 0.2 * Math.sin(x * 0.017)) + 50 + rng() * 30;
      if (kind !== 'pyramid') decor(ctx, kind, x, Math.min(h - 10, yy), 0.55 + rng() * 0.35, rng, th);
      x += 120 + rng() * 220;
    }
    hill(h - 10, 34, th.mid[1], 0.01, 0.023, rng() * 6);
  }

  // ---------- ground ----------
  function groundLayer(L, th, rng) {
    const ctx = L.x, w = L.w, h = L.h;
    const top = 14, pTop = GROUND_Y - 18 - GR_Y, pBot = GROUND_Y + LANE_H + 22 - GR_Y;
    // grass/ground body
    ctx.beginPath(); ctx.moveTo(0, top);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, top + Math.sin(x * 0.05) * 2 + Math.sin(x * 0.013) * 3);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, h);
    g.addColorStop(0, th.ground); g.addColorStop(1, th.groundDark);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = th.grass; ctx.lineWidth = 4; ctx.stroke();
    // path
    ctx.beginPath(); ctx.moveTo(0, pTop);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, pTop + Math.sin(x * 0.02) * 2.5);
    for (let x = w; x >= 0; x -= 20) ctx.lineTo(x, pBot + Math.sin(x * 0.017 + 1) * 3);
    ctx.closePath();
    ctx.fillStyle = th.path; ctx.fill();
    ctx.strokeStyle = th.pathDark; ctx.lineWidth = 3; ctx.stroke();
    // path speckles
    for (let i = 0; i < w / 9; i++) {
      const px = rng() * w, py = pTop + 6 + rng() * (pBot - pTop - 12);
      ctx.fillStyle = th.pathDark; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(px, py, 1.5 + rng() * 3, 1 + rng() * 1.5, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // grass tufts, flowers, pebbles
    for (let i = 0; i < w / 22; i++) {
      const px = rng() * w;
      let py = top + 4 + rng() * (pTop - top - 6);
      if (rng() < 0.45) py = pBot + 8 + rng() * (h - pBot - 14);
      const kind = rng();
      if (th === THEMES.volcano && kind < 0.15) {
        ctx.strokeStyle = th.lava; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 8, py + 3); ctx.lineTo(px + 14, py + 1); ctx.lineTo(px + 22, py + 4); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (kind < 0.6) {
        ctx.strokeStyle = th.grass; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px - 6, py - 7); ctx.moveTo(px, py); ctx.lineTo(px, py - 9); ctx.moveTo(px + 4, py); ctx.lineTo(px + 6, py - 7); ctx.stroke();
      } else if (kind < 0.75 && th === THEMES.meadow) {
        const fc = ['#ff6b8a', '#ffd23f', '#ffffff', '#b38cff'][(rng() * 4) | 0];
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(px + Math.cos(k * 1.256) * 2.6, py - 6 + Math.sin(k * 1.256) * 2.6, 2, 0, TAU); ctx.fillStyle = fc; ctx.fill(); }
        ctx.beginPath(); ctx.arc(px, py - 6, 1.5, 0, TAU); ctx.fillStyle = '#ffb300'; ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(0,0,0,.14)';
        ctx.beginPath(); ctx.ellipse(px, py, 4 + rng() * 4, 2 + rng() * 2, 0, 0, TAU); ctx.fill();
      }
    }
  }

  function build(themeName, worldW, res) {
    const th = THEMES[themeName] || THEMES.meadow;
    const rng = U.rng(U.hash(themeName) + worldW);
    const farW = Math.ceil(VIEW_W + (worldW - VIEW_W) * PAR_FAR) + 8;
    const midW = Math.ceil(VIEW_W + (worldW - VIEW_W) * PAR_MID) + 8;
    const far = mk(farW, FAR_H, res), mid = mk(midW, MID_H, res), ground = mk(worldW, GR_H, res);
    farLayer(far, th, rng); midLayer(mid, th, rng); groundLayer(ground, th, rng);
    return { th, far, mid, ground, res };
  }

  /** Blit a pre-rendered layer with horizontal offset `sx` (logical px). */
  function blit(ctx, L, sx, dy) {
    const r = L.c.width / L.w;
    const w = Math.min(VIEW_W, L.w - sx);
    if (w <= 0) return;
    ctx.drawImage(L.c, Math.max(0, sx * r), 0, w * r, L.c.height, 0, dy, w, L.h);
  }

  function drawSky(ctx, th, t) {
    const g = ctx.createLinearGradient(0, 0, 0, GR_Y + 20);
    g.addColorStop(0, th.sky[0]); g.addColorStop(0.55, th.sky[1]); g.addColorStop(1, th.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (th.stars) {
      for (let i = 0; i < 70; i++) {
        const x = (i * 197.3) % VIEW_W, y = (i * 83.7) % 330;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + i);
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    if (th.sun) {
      const sg = ctx.createRadialGradient(1010, 150, 10, 1010, 150, 140);
      sg.addColorStop(0, 'rgba(255,255,230,.9)'); sg.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(1010, 150, 140, 0, TAU); ctx.fill();
      ctx.fillStyle = th.sun; ctx.beginPath(); ctx.arc(1010, 150, 44, 0, TAU); ctx.fill();
    }
    if (th.moon) {
      ctx.fillStyle = 'rgba(255,255,220,.18)'; ctx.beginPath(); ctx.arc(980, 140, 80, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff8d6'; ctx.beginPath(); ctx.arc(980, 140, 40, 0, TAU); ctx.fill();
      ctx.fillStyle = th.sky[0]; ctx.beginPath(); ctx.arc(997, 128, 34, 0, TAU); ctx.fill();
    }
    if (th === THEMES.volcano) {
      const hg = ctx.createLinearGradient(0, 300, 0, 470);
      hg.addColorStop(0, 'rgba(255,90,30,0)'); hg.addColorStop(1, 'rgba(255,110,40,.45)');
      ctx.fillStyle = hg; ctx.fillRect(0, 300, VIEW_W, 170);
    }
    if (th.skyFx) th.skyFx(ctx, t);
  }

  // ---------- clouds & weather ----------
  function makeClouds(worldW) {
    const span = VIEW_W + (worldW - VIEW_W) * PAR_CLOUD + 400;
    const list = [];
    for (let i = 0; i < 7; i++) list.push({ x: Math.random() * span - 200, y: 70 + Math.random() * 170, s: 0.6 + Math.random() * 0.8, v: 4 + Math.random() * 8, span });
    return list;
  }
  function drawClouds(ctx, clouds, th, camX, dt) {
    ctx.fillStyle = th.cloud;
    for (const c of clouds) {
      c.x += c.v * dt;
      if (c.x > c.span - 200) c.x = -200;
      const x = c.x - camX * PAR_CLOUD, y = c.y, s = c.s;
      if (x < -160 || x > VIEW_W + 160) continue;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(x, y, 26 * s, 0, TAU); ctx.arc(x + 30 * s, y - 14 * s, 30 * s, 0, TAU);
      ctx.arc(x + 62 * s, y, 24 * s, 0, TAU); ctx.arc(x + 32 * s, y + 6 * s, 26 * s, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function makeWeather(kind) {
    const list = [];
    const n = WEATHER[kind] ? WEATHER[kind].n : kind === 'snow' ? 90 : kind === 'ember' ? 50 : kind === 'firefly' ? 30 : kind === 'dust' ? 26 : 0;
    for (let i = 0; i < n; i++) list.push({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, r: Math.random(), p: Math.random() * TAU });
    return { kind, list };
  }
  function drawWeather(ctx, W, dt, t) {
    if (!W || !W.kind) return;
    if (WEATHER[W.kind]) { WEATHER[W.kind].draw(ctx, W, dt, t); return; }
    for (const p of W.list) {
      if (W.kind === 'snow') {
        p.y += (30 + p.r * 50) * dt; p.x += Math.sin(t + p.p) * 20 * dt - 8 * dt;
        if (p.y > VIEW_H) { p.y = -5; p.x = Math.random() * VIEW_W; }
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5 + p.r * 2, 0, TAU); ctx.fill();
      } else if (W.kind === 'ember') {
        p.y -= (25 + p.r * 40) * dt; p.x += Math.sin(t * 2 + p.p) * 25 * dt;
        if (p.y < -5) { p.y = VIEW_H + 5; p.x = Math.random() * VIEW_W; }
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + p.p);
        ctx.fillStyle = p.r > 0.5 ? '#ffb02e' : '#ff5a1f'; ctx.fillRect(p.x, p.y, 2.5, 2.5);
        ctx.globalAlpha = 1;
      } else if (W.kind === 'firefly') {
        p.x += Math.sin(t * 0.7 + p.p) * 18 * dt; p.y += Math.cos(t * 0.9 + p.p * 2) * 12 * dt;
        if (p.y < 150) p.y = 470; if (p.y > 480) p.y = 160;
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + p.p));
        ctx.fillStyle = '#d9f99d'; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (W.kind === 'dust') {
        p.x -= (40 + p.r * 60) * dt; p.y += Math.sin(t + p.p) * 6 * dt;
        if (p.x < -10) { p.x = VIEW_W + 10; p.y = 250 + Math.random() * 300; }
        ctx.fillStyle = 'rgba(255,235,200,.45)'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5 + p.r * 2, 0, TAU); ctx.fill();
      }
    }
  }

  // ---------- bases ----------
  function cracks(ctx, frac, seed) {
    if (frac > 0.66) return;
    const rng = U.rng(seed);
    const n = frac > 0.33 ? 3 : 6;
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
    for (let i = 0; i < n; i++) {
      let x = -40 + rng() * 80, y = -40 - rng() * 160;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += -8 + rng() * 16; y += 6 + rng() * 10; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  function sinkBegin(ctx, b, t, h) {
    let ox = 0;
    if (b.hitT > 0) ox = Math.sin(t * 90) * 3.5 * (b.hitT / 0.15);
    let sink = 0;
    if (b.destroyed) sink = U.easeIn(Math.min(1, b.destroyT / 1.5)) * (h + 20);
    ctx.save();
    ctx.translate(b.x + ox, BASE_GY);
    if (b.destroyed) {
      ctx.beginPath(); ctx.rect(-200, -h - 200, 400, h + 200); ctx.clip();
      ctx.translate(Math.sin(t * 50) * 3, sink);
    }
  }
  function rubble(ctx, b, t) {
    if (!b.destroyed) return;
    const rng = U.rng(77 + b.team);
    const k = Math.min(1, b.destroyT / 1.2);
    ctx.save(); ctx.translate(b.x, BASE_GY + 2);
    for (let i = 0; i < 16; i++) {
      const x = -80 + rng() * 160, y = -rng() * 30 * k, s = 8 + rng() * 14;
      ctx.beginPath(); ctx.moveTo(x - s, 0); ctx.lineTo(x - s * 0.6, y - s * 0.8); ctx.lineTo(x + s * 0.5, y - s); ctx.lineTo(x + s, 0); ctx.closePath();
      ctx.fillStyle = b.team === 0 ? (i % 2 ? '#e6dccb' : '#cbbfa9') : (i % 2 ? '#4a3f4f' : '#3a3140'); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.restore();
  }

  function drawTower(ctx, b, t) {
    sinkBegin(ctx, b, t, 360);
    ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
    // plinth
    U.rrect(ctx, -70, -38, 140, 40, 8); ctx.fillStyle = '#cfc5b3'; ctx.fill(); ctx.stroke();
    // body
    ctx.beginPath(); ctx.moveTo(-55, -36); ctx.lineTo(-48, -216); ctx.lineTo(48, -216); ctx.lineTo(55, -36); ctx.closePath();
    const g = ctx.createLinearGradient(-55, 0, 55, 0);
    g.addColorStop(0, '#fffaf0'); g.addColorStop(0.7, '#f1e8d6'); g.addColorStop(1, '#ddd1bb');
    ctx.fillStyle = g; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,100,70,.35)'; ctx.lineWidth = 2;
    for (const [x1, y1, x2] of [[-40, -70, -12], [10, -96, 38], [-34, -130, -6], [14, -176, 40], [-38, -196, -14], [20, -60, 44]]) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.stroke();
    }
    ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    // battlement ring
    U.rrect(ctx, -62, -236, 124, 24, 5); ctx.fillStyle = '#e9dfcc'; ctx.fill(); ctx.stroke();
    // roof
    ctx.beginPath(); ctx.moveTo(-70, -232); ctx.quadraticCurveTo(-30, -262, 0, -318); ctx.quadraticCurveTo(30, -262, 70, -232); ctx.closePath();
    const rg = ctx.createLinearGradient(-70, 0, 70, 0);
    rg.addColorStop(0, '#60a5fa'); rg.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = rg; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-40, -244); ctx.quadraticCurveTo(-18, -268, -4, -300); ctx.stroke();
    // flag
    ctx.strokeStyle = OUT; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(0, -316); ctx.lineTo(0, -360); ctx.stroke();
    const w1 = Math.sin(t * 5) * 3, w2 = Math.sin(t * 5 + 1.5) * 4;
    ctx.beginPath(); ctx.moveTo(1, -360); ctx.quadraticCurveTo(18, -364 + w1, 38, -356 + w2); ctx.lineTo(34, -344 + w2); ctx.quadraticCurveTo(18, -340 + w1, 1, -340); ctx.closePath();
    ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(17, -351 + w1 * 0.6, 4.5, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    // window with a peeking stickman
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-15, -140); ctx.lineTo(-15, -168); ctx.arc(0, -168, 15, Math.PI, 0); ctx.lineTo(15, -140); ctx.closePath();
    ctx.fillStyle = '#3a2a20'; ctx.fill(); ctx.stroke();
    const peek = Math.sin(t * 1.3) > 0.2 ? 0 : 8;
    ctx.save(); ctx.clip();
    ctx.beginPath(); ctx.arc(2, -156 + peek, 7.5, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(3.5, -158 + peek, 2, 2); ctx.fillRect(7, -158 + peek, 2, 2);
    ctx.restore();
    // door
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-22, -36); ctx.lineTo(-22, -72); ctx.arc(0, -72, 22, Math.PI, 0); ctx.lineTo(22, -36); ctx.closePath();
    ctx.fillStyle = '#8a5a34'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2;
    for (const x of [-9, 0, 9]) { ctx.beginPath(); ctx.moveTo(x, -38); ctx.lineTo(x, -88); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(12, -60, 2.5, 0, TAU); ctx.fillStyle = '#fbbf24'; ctx.fill();
    cracks(ctx, b.hp / b.maxHp, 11);
    ctx.restore();
    rubble(ctx, b, t);
  }

  function drawFortress(ctx, b, t) {
    sinkBegin(ctx, b, t, 300);
    ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
    const tower = (x, w, h, roof) => {
      ctx.beginPath(); ctx.rect(x - w / 2, -h, w, h); ctx.fillStyle = '#433849'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, -h); ctx.lineTo(x, -h - roof); ctx.lineTo(x + w / 2 + 8, -h); ctx.closePath();
      ctx.fillStyle = '#b91c1c'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(x - 5, -h + 26, 10, 18); ctx.fillStyle = '#ffb020'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 4;
    };
    tower(56, 38, 236, 46);
    // main keep
    ctx.beginPath(); ctx.moveTo(-74, 0); ctx.lineTo(-64, -196); ctx.lineTo(64, -196); ctx.lineTo(74, 0); ctx.closePath();
    const g = ctx.createLinearGradient(-74, 0, 74, 0);
    g.addColorStop(0, '#5a4d61'); g.addColorStop(1, '#3a3040');
    ctx.fillStyle = g; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 2;
    for (let r = 0; r < 7; r++) {
      const y = -24 - r * 26;
      ctx.beginPath(); ctx.moveTo(-66 + r, y); ctx.lineTo(66 - r, y); ctx.stroke();
      for (let c = 0; c < 4; c++) { const x = -50 + c * 34 + (r % 2) * 17; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 26); ctx.stroke(); }
    }
    ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    // spikes
    for (let i = 0; i < 6; i++) {
      const x = -60 + i * 24;
      ctx.beginPath(); ctx.moveTo(x - 9, -195); ctx.lineTo(x, -218); ctx.lineTo(x + 9, -195); ctx.closePath();
      ctx.fillStyle = '#2b2430'; ctx.fill(); ctx.stroke();
    }
    tower(-62, 34, 250, 50);
    // banner
    const w = Math.sin(t * 4) * 2;
    ctx.beginPath(); ctx.moveTo(18, -184); ctx.lineTo(46, -184); ctx.lineTo(46 + w, -120); ctx.lineTo(32, -132); ctx.lineTo(18 + w, -120); ctx.closePath();
    ctx.fillStyle = '#dc2626'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(32, -160, 6, 0, TAU); ctx.fillStyle = '#f5f5f4'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(28.5, -162, 2.5, 2.5); ctx.fillRect(33, -162, 2.5, 2.5);
    // the evil eye
    const blink = (t % 4.2) < 0.14 ? 0.12 : 1;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(-12, -140, 24, 15 * blink, 0, 0, TAU);
    ctx.fillStyle = '#fff2e0'; ctx.fill(); ctx.stroke();
    if (blink > 0.5) {
      const look = Math.sin(t * 0.8) * 6 - 6;
      ctx.beginPath(); ctx.ellipse(-12 + look, -140, 9, 12, 0, 0, TAU);
      const eg = ctx.createRadialGradient(-12 + look, -140, 1, -12 + look, -140, 12);
      eg.addColorStop(0, '#ff7070'); eg.addColorStop(1, '#b30000');
      ctx.fillStyle = eg; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-12 + look, -140, 2.5, 8, 0, 0, TAU); ctx.fillStyle = '#111'; ctx.fill();
    }
    // gate
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(-28, -56); ctx.arc(0, -56, 28, Math.PI, 0); ctx.lineTo(28, 0); ctx.closePath();
    const gg = ctx.createLinearGradient(0, -84, 0, 0);
    gg.addColorStop(0, '#1a0c10'); gg.addColorStop(1, '#5a1010');
    ctx.fillStyle = gg; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#7a7280'; ctx.lineWidth = 2.5;
    for (const x of [-16, -6, 4, 14]) { ctx.beginPath(); ctx.moveTo(x, -78 + Math.abs(x) * 0.6); ctx.lineTo(x, -12); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-26, -40); ctx.lineTo(26, -40); ctx.stroke();
    // torches
    for (const tx of [-62, 56]) {
      const fy = tx < 0 ? -300 : -282;
      const fl = Math.sin(t * 20 + tx) * 2;
      ctx.beginPath(); ctx.moveTo(tx - 5, fy + 12); ctx.quadraticCurveTo(tx - 6, fy, tx + fl, fy - 10); ctx.quadraticCurveTo(tx + 6, fy, tx + 5, fy + 12); ctx.closePath();
      ctx.fillStyle = '#ff8a1f'; ctx.fill();
      ctx.beginPath(); ctx.arc(tx, fy + 6, 3, 0, TAU); ctx.fillStyle = '#ffe066'; ctx.fill();
    }
    cracks(ctx, b.hp / b.maxHp, 23);
    ctx.restore();
    rubble(ctx, b, t);
  }

  function drawPortal(ctx, b, t) {
    ctx.save(); ctx.translate(b.x, BASE_GY);
    ctx.lineWidth = 4; ctx.strokeStyle = OUT;
    // stone arch
    ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-70, -150); ctx.arc(0, -150, 70, Math.PI, 0); ctx.lineTo(70, 0); ctx.lineTo(48, 0); ctx.lineTo(48, -150); ctx.arc(0, -150, 48, 0, Math.PI, true); ctx.lineTo(-48, 0); ctx.closePath();
    ctx.fillStyle = '#4b4a6b'; ctx.fill(); ctx.stroke();
    // swirl
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-48, 0); ctx.lineTo(-48, -150); ctx.arc(0, -150, 48, Math.PI, 0); ctx.lineTo(48, 0); ctx.closePath(); ctx.clip();
    const g = ctx.createRadialGradient(0, -110, 5, 0, -110, 120);
    g.addColorStop(0, '#f5d0fe'); g.addColorStop(0.4, '#a855f7'); g.addColorStop(1, '#2e1065');
    ctx.fillStyle = g; ctx.fillRect(-50, -210, 100, 210);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(0, -110, 14 + i * 16, t * (1.5 + i * 0.3) + i, t * (1.5 + i * 0.3) + i + 2.2); ctx.stroke();
    }
    ctx.restore();
    // runes
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + (i / 5) * Math.PI;
      const rx = Math.cos(a) * 59, ry = -150 + Math.sin(a) * 59;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i);
      ctx.fillStyle = '#e9d5ff'; ctx.beginPath(); ctx.arc(rx, ry, 4, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawBase(ctx, b, t) {
    if (b.team === 0) drawTower(ctx, b, t);
    else if (b.portal) drawPortal(ctx, b, t);
    else drawFortress(ctx, b, t);
  }

  // ---------- world map backdrop ----------
  const MapScene = (() => {
    let cache = null, cacheRes = 0, cacheC = 0;
    const regionsOf = c => REGIONS.filter(r => (r.campaign || 1) === c);
    const levelsOf = c => LEVELS.filter(l => (l.c || 1) === c);
    const TOP = 74, BOT = 634;

    function region(th, rng, w) {
      const R = mk(w, VIEW_H, cacheRes);
      const ctx = R.x;
      const sg = ctx.createLinearGradient(0, TOP, 0, 270);
      sg.addColorStop(0, th.sky[0]); sg.addColorStop(1, th.sky[2]);
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, 300);
      if (th.sun) { ctx.fillStyle = th.sun; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(w * 0.7, 150, 22, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      // mountains
      const far = mk(w, 180, cacheRes);
      farLayer(far, th, rng);
      ctx.drawImage(far.c, 0, 0, far.c.width, far.c.height, 0, 120, w, 180);
      // ground (top-down-ish)
      const gg = ctx.createLinearGradient(0, 270, 0, VIEW_H);
      gg.addColorStop(0, th.ground); gg.addColorStop(1, th.groundDark);
      ctx.beginPath(); ctx.moveTo(0, 280);
      for (let x = 0; x <= w; x += 10) ctx.lineTo(x, 276 + Math.sin(x * 0.03) * 4);
      ctx.lineTo(w, VIEW_H); ctx.lineTo(0, VIEW_H); ctx.closePath();
      ctx.fillStyle = gg; ctx.fill();
      ctx.strokeStyle = th.grass; ctx.lineWidth = 4; ctx.stroke();
      // patches
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = 'rgba(0,0,0,.06)';
        ctx.beginPath(); ctx.ellipse(rng() * w, 300 + rng() * 330, 20 + rng() * 40, 8 + rng() * 12, 0, 0, TAU); ctx.fill();
      }
      if (th === THEMES.volcano) {
        for (let i = 0; i < 4; i++) {
          const lx = 40 + rng() * (w - 80), ly = 520 + rng() * 90;
          ctx.fillStyle = '#ff6a1a'; ctx.beginPath(); ctx.ellipse(lx, ly, 34, 11, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffc04a'; ctx.beginPath(); ctx.ellipse(lx - 6, ly - 2, 16, 4, 0, 0, TAU); ctx.fill();
        }
      }
      return R;
    }

    function build(res, camp) {
      cacheRes = res; cacheC = camp;
      const C = mk(VIEW_W, VIEW_H, res);
      const ctx = C.x;
      const pad = 50, rw = 320;
      const REGS = regionsOf(camp), LVS = levelsOf(camp);
      REGS.forEach((reg, i) => {
        const th = THEMES[reg.theme];
        const rng = U.rng(500 + i * 31);
        const R = region(th, rng, rw + pad * 2);
        // soft edges
        R.x.save(); R.x.globalCompositeOperation = 'destination-in';
        const mg = R.x.createLinearGradient(0, 0, rw + pad * 2, 0);
        mg.addColorStop(0, i === 0 ? '#000' : 'rgba(0,0,0,0)'); mg.addColorStop((pad * 1.6) / (rw + pad * 2), '#000');
        mg.addColorStop(1 - (pad * 1.6) / (rw + pad * 2), '#000'); mg.addColorStop(1, i === REGS.length - 1 ? '#000' : 'rgba(0,0,0,0)');
        R.x.fillStyle = mg; R.x.fillRect(0, 0, rw + pad * 2, VIEW_H); R.x.restore();
        ctx.drawImage(R.c, 0, 0, R.c.width, R.c.height, i * rw - pad, 0, rw + pad * 2, VIEW_H);
      });
      // decor (avoid the level nodes)
      const rng = U.rng(99 + camp);
      const nodes = LVS.map(l => l.map);
      const props = [];
      for (let i = 0; i < 70; i++) {
        const x = 10 + rng() * 1260, y = 300 + rng() * 320;
        if (nodes.some(([nx, ny]) => Math.hypot(nx - x, ny - y) < 75)) continue;
        if (pathDist(x, y, LVS) < 30) continue;
        props.push([x, y]);
      }
      props.sort((a, b) => a[1] - b[1]);
      for (const [x, y] of props) {
        const reg = REGS[Math.min(3, Math.floor(x / 320))];
        const th = THEMES[reg.theme];
        const kind = th.decor[(rng() * th.decor.length) | 0];
        decor(ctx, kind === 'pyramid' && rng() < 0.6 ? 'cactus' : kind, x, y, kind === 'pyramid' ? 0.5 : 0.42 + (y - 300) / 900, rng, th);
      }
      // path
      const pts = LVS.map(l => l.map);
      const trace = () => {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
          ctx.bezierCurveTo(x0 + (x1 - x0) * 0.5, y0, x0 + (x1 - x0) * 0.5, y1, x1, y1);
        }
      };
      trace(); ctx.strokeStyle = 'rgba(43,33,24,.85)'; ctx.lineWidth = 16; ctx.stroke();
      trace(); ctx.strokeStyle = '#f4e2b8'; ctx.lineWidth = 10; ctx.stroke();
      trace(); ctx.setLineDash([2, 14]); ctx.strokeStyle = 'rgba(140,100,60,.8)'; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);
      cache = C;
    }
    function pathDist(x, y, LVS) {
      let best = 1e9;
      const pts = LVS.map(l => l.map);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        for (let k = 0; k <= 10; k++) { const t = k / 10; best = Math.min(best, Math.hypot(x - U.lerp(x0, x1, t), y - U.lerp(y0, y1, t))); }
      }
      return best;
    }
    const clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 240, y: 110 + (i % 3) * 40, s: 0.5 + (i % 2) * 0.3, v: 8 + i * 2, span: 1700 }));

    function render(ctx, t, dt, res, frontier, camp = 1) {
      if (!cache || cacheRes !== res || cacheC !== camp) build(res, camp);
      ctx.drawImage(cache.c, 0, 0, cache.c.width, cache.c.height, 0, 0, VIEW_W, VIEW_H);
      drawClouds(ctx, clouds, { cloud: '#ffffff' }, 0, dt);
      // the hero marker on the current level
      const L = LEVELS[Math.min(LEVELS.length - 1, frontier - 1)];
      if (L && (L.c || 1) === camp) {
        const [x, y] = L.map;
        const def = UNITS[0];
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x + 50, y + 22, 14, 4, 0, 0, TAU); ctx.fill();
        Stick.drawPreview(ctx, def, 0, x + 48, y + 22 - Math.abs(Math.sin(t * 4)) * 6, 0.9, t, 'anim');
      }
    }
    return { render, invalidate() { cache = null; } };
  })();

  return { build, blit, drawSky, makeClouds, drawClouds, makeWeather, drawWeather, drawBase, decor, MapScene, DECOR, WEATHER };
})();
