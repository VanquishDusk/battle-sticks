'use strict';
/* =========================================================
   Campaign 2 art: enemy gear for the stickman renderer and
   the four new battlefield themes (Stormcoast, Gloomwood,
   Ironworks, The Rift) with their decor and weather.
   ========================================================= */

(() => {
  const { circ, seg, poly, inHand, torsoPt } = Stick.H;
  const HR = Stick.HR;
  const HD = Stick.HEAD, BK = Stick.BACK, W = Stick.WPN, L = Stick.LAYER, F = Stick.FACE;

  // ---------- faces ----------
  F.ghost = (c, o) => {
    c.fillStyle = '#0f172a';
    c.beginPath(); c.ellipse(3.2, -1.6, 1.5, 2.3, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(6.8, -1.6, 1.5, 2.3, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(5, 4, 1.4, 1.9 + Math.sin(o.t * 4) * 0.4, 0, 0, TAU); c.fill();
  };
  F.blot = (c, o) => {
    poly(c, [1.8, -3.4, 4.6, -2.6, 4.2, -0.2, 2, 0.2], '#f5f3ff', null);
    poly(c, [5.6, -2.4, 8.2, -3.6, 8, -0.4, 5.8, 0], '#f5f3ff', null);
    circ(c, 3.2, -1.4, 0.8, '#7c3aed'); circ(c, 6.9, -1.6, 0.8, '#7c3aed');
    c.strokeStyle = '#c4b5fd'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(2.4, 3.6); c.lineTo(3.6, 2.6); c.lineTo(4.6, 4); c.lineTo(5.8, 2.8); c.lineTo(7, 4); c.lineTo(8, 3); c.stroke();
  };

  // ---------- headgear ----------
  HD.aviator = (c, o) => {
    c.beginPath(); c.arc(0, -0.5, HR + 1, Math.PI * 1.02, -0.05); c.lineTo(HR - 1, 2); c.lineTo(-HR - 1, 2); c.closePath();
    c.fillStyle = '#7c4a24'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.3; c.stroke();
    seg(c, -HR + 1, 2, -HR - 1, 7, '#7c4a24', 2.4);
    circ(c, 3, -5.4, 2.6, '#bae6fd', o.ink, 1); circ(c, 8, -5, 2.4, '#bae6fd', o.ink, 1);
    seg(c, -HR, -5, 0.6, -5.4, o.ink, 1.2);
  };
  HD.minerhelm = (c, o) => {
    c.beginPath(); c.arc(0, -0.5, HR + 1.4, Math.PI, 0); c.lineTo(HR + 4, -0.5); c.lineTo(-HR - 1.4, -0.5); c.closePath();
    c.fillStyle = '#eab308'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.4; c.stroke();
    ZArt.glow(c, HR + 1, -6, 9, '#fef08a', 0.8);
    circ(c, HR - 1, -6, 2.4, '#fef9c3', o.ink, 1);
  };
  HD.rivethelm = (c, o) => {
    c.beginPath(); c.arc(0, -0.2, HR + 1.8, Math.PI * 0.92, Math.PI * 0.08 + TAU); c.closePath();
    c.fillStyle = '#6b7280'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.6; c.stroke();
    for (let i = 0; i < 5; i++) { const a = Math.PI + 0.3 + i * 0.6; circ(c, Math.cos(a) * (HR - 0.5), -0.2 + Math.sin(a) * (HR - 0.5), 0.9, '#d1d5db'); }
    poly(c, [-2, -HR - 1.5, 2, -HR - 1.5, 1, -HR - 6, -1, -HR - 6], '#4b5563', o.ink, 1);
  };
  HD.beak = (c, o) => {
    poly(c, [HR - 2, -3, HR + 12, 0.5, HR + 7, 3, HR - 1, 2.6], '#f59e0b', o.ink, 1.2);
    seg(c, HR + 1, 0.4, HR + 9, 1.6, '#b45309', 0.9);
  };
  HD.crest = (c, o) => {
    for (let i = 0; i < 4; i++) poly(c, [-4 + i * 2, -HR + 1, -10 + i * 3, -HR - 9 - i * 2, -1 + i * 2, -HR], i % 2 ? '#0f766e' : '#14b8a6', o.ink, 0.8);
  };
  HD.wraithcrown = (c, o) => {
    c.globalAlpha *= 0.55;
    c.beginPath(); c.moveTo(-HR - 2, -2); c.quadraticCurveTo(-HR - 8, 10, -HR - 4, 20); c.lineTo(-HR + 3, 14); c.quadraticCurveTo(-HR + 1, 4, -HR + 2, -2); c.closePath();
    c.fillStyle = '#a5f3fc'; c.fill();
    c.globalAlpha = o.alpha;
    for (let i = 0; i < 5; i++) poly(c, [-6 + i * 3, -HR + 1, -5 + i * 3, -HR - 6 - (i % 2 ? 0 : 4), -4 + i * 3, -HR + 1], '#e0f2fe', '#67e8f9', 0.7);
  };
  HD.gearcrown = (c, o) => {
    c.save(); c.translate(0, -HR - 2); c.rotate(o.t * 0.8);
    c.fillStyle = '#b45309'; c.strokeStyle = o.ink; c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = i % 2 ? 7.5 : 5.5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.5); }
    c.closePath(); c.fill(); c.stroke();
    circ(c, 0, 0, 2, '#fbbf24');
    c.restore();
  };

  // ---------- backs ----------
  function wing(ctx, x, y, size, flap, col, ink) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4 - flap * 0.6);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-size * 0.6, -size * 0.7, -size * 1.1, -size * 0.55);
    for (let i = 0; i < 4; i++) ctx.lineTo(-size * (1.05 - i * 0.24), -size * 0.2 + i * size * 0.08);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 0.8;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-size * 0.2, -size * 0.12); ctx.lineTo(-size * (1 - i * 0.22), -size * 0.35 + i * size * 0.05); ctx.stroke(); }
    ctx.restore();
  }
  BK.wings = (ctx, J, o) => {
    const p = torsoPt(J, 0.85), flap = Math.sin(o.t * (o.preview ? 6 : 14) + (o.seed || 0));
    wing(ctx, p.x - 2, p.y, 22, flap, '#64748b', o.ink);
    wing(ctx, p.x + 1, p.y + 1, 19, flap * 0.8 + 0.2, '#94a3b8', o.ink);
  };
  BK.bigwings = (ctx, J, o) => {
    const p = torsoPt(J, 0.85), flap = Math.sin(o.t * (o.preview ? 4 : 7) + (o.seed || 0));
    wing(ctx, p.x - 2, p.y, 40, flap, '#0f766e', o.ink);
    wing(ctx, p.x + 2, p.y + 2, 34, flap * 0.85 + 0.2, '#14b8a6', o.ink);
  };
  BK.smokestack = (ctx, J, o) => {
    const p = torsoPt(J, 0.7);
    ctx.save(); ctx.translate(p.x - 7, p.y); ctx.rotate(J.lean);
    ctx.fillStyle = '#374151'; ctx.fillRect(-4, -22, 8, 26); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.2; ctx.strokeRect(-4, -22, 8, 26);
    ctx.fillStyle = '#111827'; ctx.fillRect(-5.5, -24, 11, 3);
    for (let i = 0; i < 3; i++) {
      const k = (o.t * 0.8 + i / 3) % 1;
      ctx.globalAlpha = o.alpha * (1 - k) * 0.6;
      circ(ctx, -2 - k * 8, -28 - k * 22, 3 + k * 5, '#6b7280');
    }
    ctx.restore();
  };

  // ---------- weapons ----------
  W.pickaxe = (ctx, J, o) => inHand(ctx, J, 0, c => {
    seg(c, 0, 8, 0, -22, '#7a4a22', 2.6);
    c.beginPath(); c.moveTo(-11, -17); c.quadraticCurveTo(0, -27, 11, -17); c.quadraticCurveTo(0, -22, -11, -17); c.closePath();
    c.fillStyle = '#9ca3af'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.2; c.stroke();
  });
  W.wrench = (ctx, J, o) => inHand(ctx, J, 0, c => {
    seg(c, 0, 6, 0, -20, '#6b7280', 4);
    seg(c, 0, 6, 0, -20, '#9ca3af', 2.2);
    c.beginPath(); c.arc(0, -24, 6, 0.6, Math.PI * 2 - 0.6); c.lineTo(Math.cos(0.6) * 2.5, -24 + Math.sin(-0.6) * 2.5); c.lineTo(Math.cos(0.6) * 2.5, -24 + Math.sin(0.6) * 2.5); c.closePath();
    c.fillStyle = '#9ca3af'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.2; c.stroke();
  });

  // ---------- body layers ----------
  L.ghostSheet = (ctx, J, o) => {
    const n = J.neck, footY = Math.max(J.fF.y, J.fB.y) - 1, hw = 13;
    ctx.save(); ctx.globalAlpha = o.alpha * 0.92;
    ctx.beginPath(); ctx.moveTo(n.x - 5, n.y - 2);
    ctx.quadraticCurveTo(n.x - hw, (n.y + footY) / 2, n.x - hw - 2, footY);
    for (let i = 0; i <= 6; i++) { const x = n.x - hw - 2 + i * ((hw * 2 + 4) / 6); ctx.lineTo(x, footY - (i % 2 ? 6 : 0) + Math.sin(o.t * 6 + i) * 1.5); }
    ctx.quadraticCurveTo(n.x + hw, (n.y + footY) / 2, n.x + 5, n.y - 2); ctx.closePath();
    ctx.fillStyle = o.look.headFill || '#e2e8f0'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  };
  L.ironPlate = (ctx, J, o) => {
    const a = torsoPt(J, 0.2), b = torsoPt(J, 0.92);
    ctx.beginPath(); ctx.moveTo(a.x - 6, a.y); ctx.lineTo(b.x - 8, b.y); ctx.lineTo(b.x + 8, b.y); ctx.lineTo(a.x + 6, a.y); ctx.closePath();
    ctx.fillStyle = '#6b7280'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.5; ctx.stroke();
    seg(ctx, (a.x + b.x) / 2 - 7, (a.y + b.y) / 2, (a.x + b.x) / 2 + 7, (a.y + b.y) / 2, '#4b5563', 1.2);
    for (const f of [0.3, 0.55, 0.8]) { const p = torsoPt(J, f); circ(ctx, p.x - 4, p.y, 0.9, '#d1d5db'); circ(ctx, p.x + 4, p.y, 0.9, '#d1d5db'); }
    ctx.beginPath(); ctx.ellipse(J.s.x, J.s.y + 1, 6, 4, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = '#4b5563'; ctx.fill(); ctx.stroke();
  };
  L.inkDrip = (ctx, J, o) => {
    const drips = [[J.hip, 0], [J.hF, 1], [J.hB, 2], [torsoPt(J, 0.5), 3]];
    for (const [p, i] of drips) {
      const k = (o.t * 0.9 + i * 0.27 + (o.seed || 0)) % 1;
      ctx.globalAlpha = o.alpha * (1 - k);
      ctx.fillStyle = o.ink;
      ctx.beginPath(); ctx.ellipse(p.x + (i - 1.5) * 1.5, p.y + 3 + k * 14, 1.4, 2.4, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = o.alpha * 0.7;
    ctx.fillStyle = o.ink;
    ctx.beginPath(); ctx.ellipse((J.fF.x + J.fB.x) / 2, Math.max(J.fF.y, J.fB.y) + 1, 12, 2.4, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = o.alpha;
  };
  L.pavise = (ctx, J, o) => {
    const p = torsoPt(J, 0.45);
    ctx.save(); ctx.translate(p.x + 10, p.y);
    U.rrect(ctx, -6, -24, 12, 42, 3);
    ctx.fillStyle = '#7c2d12'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#a16207'; ctx.fillRect(-1.5, -20, 3, 34);
    circ(ctx, 0, -3, 3, '#fbbf24', o.ink, 1);
    ctx.restore();
  };
})();

/* ---------- Campaign 2 themes ---------- */
(() => {
  const D = Scenery.DECOR, WX = Scenery.WEATHER;
  const { circ, poly } = Stick.H;

  Object.assign(THEMES, {
    storm: {
      sky: ['#2f3d4e', '#5b6f84', '#9fb0c0'], sun: null, far: ['#4b5d6e', '#3c4c5c'], cap: '#cbd5e1', farShape: 'jag',
      mid: ['#55786a', '#466657'], ground: '#7d927f', groundDark: '#5e7263', path: '#bcb3a2', pathDark: '#998f7e', grass: '#3f5a4b',
      decor: ['rock', 'pine', 'lighthouse', 'rock'], pine: '#2f5546', pineCap: '#4d7a66', cloud: '#55637a', weather: 'rain', outline: 'rgba(20,30,40,.5)',
      farExtra(ctx, w, h) {
        const g = ctx.createLinearGradient(0, h - 60, 0, h);
        g.addColorStop(0, '#3f6075'); g.addColorStop(1, '#2c475a');
        ctx.fillStyle = g; ctx.fillRect(0, h - 46, w, 46);
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
        for (let x = 0; x < w; x += 46) { ctx.beginPath(); ctx.moveTo(x, h - 34 + (x % 3) * 8); ctx.quadraticCurveTo(x + 10, h - 40 + (x % 3) * 8, x + 20, h - 34 + (x % 3) * 8); ctx.stroke(); }
      },
      skyFx(ctx, t) {
        const k = (t * 0.23) % 1;
        if (k < 0.035) {
          ctx.globalAlpha = (1 - k / 0.035) * 0.45; ctx.fillStyle = '#e0f2fe'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
          const x = 200 + ((Math.floor(t * 0.23) * 377) % 880);
          ctx.strokeStyle = '#f0f9ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 0);
          for (let i = 1; i < 6; i++) ctx.lineTo(x + ((i * 37) % 50) - 25, i * 45);
          ctx.stroke();
        }
      },
    },
    gloom: {
      sky: ['#070b14', '#141c2b', '#26313f'], sun: null, moon: true, far: ['#18262a', '#111c1f'], farShape: 'peaks',
      mid: ['#1c2f26', '#15241d'], ground: '#2b3a30', groundDark: '#1d2821', path: '#4a4e44', pathDark: '#393c34', grass: '#152219',
      decor: ['deadtree', 'pine', 'grave', 'mushroom', 'deadtree'], pine: '#13261f', pineCap: '#24402f', cloud: '#222b38', weather: 'fog', outline: 'rgba(0,0,0,.55)',
      farExtra(ctx, w, h, rng) {
        for (let x = -20; x < w; x += 22 + rng() * 26) {
          const ht = 60 + rng() * 70, y = h - 4;
          ctx.fillStyle = rng() < 0.5 ? '#0f1a17' : '#132220';
          ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x, y - ht); ctx.lineTo(x + 14, y); ctx.closePath(); ctx.fill();
        }
      },
    },
    foundry: {
      sky: ['#3a271f', '#7a4a2e', '#c98a52'], sun: '#ffd9a8', far: ['#4a3b36', '#3a2d29'], farShape: 'peaks',
      mid: ['#5b4a42', '#4a3b35'], ground: '#6b5d52', groundDark: '#4f443c', path: '#8c7f71', pathDark: '#6f6358', grass: '#3d332c',
      decor: ['gear', 'pipe', 'chimney', 'rock'], cloud: '#6b5048', weather: 'ember', outline: 'rgba(0,0,0,.45)',
      farExtra(ctx, w, h, rng) {
        for (let x = 30; x < w; x += 150 + rng() * 120) {
          const bw = 70 + rng() * 60, bh = 60 + rng() * 60, y = h - 4;
          ctx.fillStyle = '#2f2420'; ctx.fillRect(x, y - bh, bw, bh);
          ctx.fillStyle = '#f59e0b';
          for (let i = 0; i < 3; i++) ctx.fillRect(x + 10 + i * (bw - 20) / 3, y - bh + 16, 8, 10);
          const cx = x + bw * 0.7;
          ctx.fillStyle = '#271c19'; ctx.fillRect(cx, y - bh - 70, 14, 70);
          ctx.fillStyle = 'rgba(90,80,80,.45)';
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + 7 + i * 12, y - bh - 82 - i * 16, 10 + i * 5, 0, TAU); ctx.fill(); }
        }
      },
    },
    rift: {
      sky: ['#04000f', '#1c0a38', '#4c1d95'], sun: null, stars: true, far: ['#2a1650', '#1d0f3a'], farShape: 'jag', cap: '#a78bfa',
      mid: ['#2e1d52', '#241540'], ground: '#3b2a5c', groundDark: '#291c43', path: '#5b4a7e', pathDark: '#47386a', grass: '#1d1235',
      decor: ['crystal', 'floatrock', 'crystal', 'floatrock'], cloud: '#3b2370', weather: 'glitch', outline: 'rgba(0,0,0,.5)',
      farExtra(ctx, w, h, rng) {
        for (let i = 0; i < w / 160; i++) {
          const x = rng() * w, y = 30 + rng() * (h - 140), s = 10 + rng() * 22;
          ctx.fillStyle = '#3b2370'; ctx.strokeStyle = 'rgba(196,181,253,.6)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.3, y + s * 1.4); ctx.lineTo(x - s * 0.4, y + s * 1.1); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      },
    },
  });

  // ---------- decor (drawn in local, already scaled coordinates) ----------
  D.lighthouse = ctx => {
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-8, -70); ctx.lineTo(8, -70); ctx.lineTo(12, 0); ctx.closePath();
    ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#dc2626'; ctx.fillRect(-10.5, -28, 21, 10); ctx.fillRect(-9, -54, 18, 10);
    ctx.fillStyle = '#fde047'; ctx.fillRect(-7, -82, 14, 12); ctx.strokeRect(-7, -82, 14, 12);
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.moveTo(-10, -82); ctx.lineTo(0, -92); ctx.lineTo(10, -82); ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  D.grave = (ctx, rng) => {
    const tilt = (rng() - 0.5) * 0.3;
    ctx.rotate(tilt);
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-10, -20); ctx.arc(0, -20, 10, Math.PI, 0); ctx.lineTo(10, 0); ctx.closePath();
    ctx.fillStyle = '#6b7280'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -12); ctx.moveTo(-4, -20); ctx.lineTo(4, -20); ctx.stroke();
  };
  D.mushroom = (ctx, rng) => {
    const col = rng() < 0.5 ? '#a78bfa' : '#5eead4';
    ctx.fillStyle = '#e7e5e4'; ctx.fillRect(-3, -12, 6, 12); ctx.strokeRect(-3, -12, 6, 12);
    ctx.beginPath(); ctx.ellipse(0, -12, 12, 7, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    circ(ctx, -4, -15, 1.5, '#ffffff'); circ(ctx, 4, -16, 1.2, '#ffffff');
  };
  D.gear = (ctx, rng) => {
    ctx.rotate(rng() * 2);
    ctx.beginPath();
    for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU, r = i % 2 ? 24 : 19; ctx.lineTo(Math.cos(a) * r, -22 + Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = '#78716c'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -22, 7, 0, TAU); ctx.fillStyle = '#44403c'; ctx.fill(); ctx.stroke();
  };
  D.pipe = ctx => {
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(-30, -24, 60, 12); ctx.strokeRect(-30, -24, 60, 12);
    ctx.fillRect(18, -24, 12, 24); ctx.strokeRect(18, -24, 12, 24);
    ctx.fillStyle = '#c2410c'; ctx.fillRect(-34, -27, 6, 18); ctx.strokeRect(-34, -27, 6, 18);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-28, -22, 44, 3);
  };
  D.chimney = ctx => {
    ctx.fillStyle = '#57534e'; ctx.fillRect(-9, -80, 18, 80); ctx.strokeRect(-9, -80, 18, 80);
    ctx.fillStyle = '#292524'; ctx.fillRect(-12, -86, 24, 7); ctx.strokeRect(-12, -86, 24, 7);
    ctx.fillStyle = '#dc2626'; ctx.fillRect(-9, -60, 18, 6);
    ctx.fillStyle = 'rgba(120,113,108,.5)';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(6 + i * 9, -98 - i * 12, 7 + i * 3, 0, TAU); ctx.fill(); }
  };
  D.floatrock = (ctx, rng) => {
    const y = -40 - rng() * 30;
    ctx.fillStyle = '#4c3a7a';
    ctx.beginPath(); ctx.moveTo(-18, y); ctx.lineTo(16, y - 3); ctx.lineTo(8, y + 16); ctx.lineTo(-2, y + 22); ctx.lineTo(-10, y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7c3aed'; ctx.fillRect(-14, y - 4, 28, 3);
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 4, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  };

  // ---------- weather ----------
  WX.rain = {
    n: 120,
    draw(ctx, W, dt) {
      ctx.strokeStyle = 'rgba(200,220,235,.55)'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (const p of W.list) {
        p.y += (700 + p.r * 300) * dt; p.x -= 160 * dt;
        if (p.y > VIEW_H) { p.y = -20; p.x = Math.random() * (VIEW_W + 200); }
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 5, p.y + 16);
      }
      ctx.stroke();
    },
  };
  WX.fog = {
    n: 26,
    draw(ctx, W, dt, t) {
      for (const p of W.list) {
        if (p.r < 0.6) {
          p.x -= (10 + p.r * 20) * dt;
          if (p.x < -200) { p.x = VIEW_W + 200; p.y = 300 + Math.random() * 260; }
          if (p.y < 300) p.y = 300 + p.y % 260;
          ctx.globalAlpha = 0.05 + p.r * 0.06; ctx.fillStyle = '#64748b';
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 160 + p.r * 120, 26, 0, 0, TAU); ctx.fill();
        } else {
          p.x += Math.sin(t * 0.7 + p.p) * 18 * dt; p.y += Math.cos(t * 0.9 + p.p * 2) * 12 * dt;
          if (p.y < 150) p.y = 470; if (p.y > 480) p.y = 160;
          ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + p.p));
          ctx.fillStyle = '#a7f3d0'; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  };
  WX.glitch = {
    n: 40,
    draw(ctx, W, dt, t) {
      for (const p of W.list) {
        p.y -= (20 + p.r * 40) * dt;
        if (p.y < -10) { p.y = VIEW_H + 10; p.x = Math.random() * VIEW_W; }
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 3 + p.p));
        ctx.fillStyle = p.r > 0.5 ? '#c4b5fd' : '#22d3ee';
        const s = 2 + p.r * 4;
        ctx.fillRect(p.x + (Math.sin(t * 20 + p.p) > 0.95 ? 6 : 0), p.y, s, s);
      }
      ctx.globalAlpha = 1;
    },
  };
})();
