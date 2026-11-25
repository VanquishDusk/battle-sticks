'use strict';
/* =========================================================
   Zodiac art: registers the 12 Zodiac designs with the
   stickman renderer (weapons, headgear, body layers) and
   provides the cosmic drawing helpers used by the summon
   animation and UI: sign glyphs, constellations, the zodiac
   wheel and astral fish.
   ========================================================= */

const ZArt = (() => {
  const { circ, seg, poly, inHand, torsoPt } = Stick.H;
  const HR = Stick.HR;
  const W = Stick.WPN, WB = Stick.WPN_BACK, HD = Stick.HEAD, L = Stick.LAYER, BK = Stick.BACK;

  // ---------- small shared shapes ----------
  function star4(ctx, x, y, r, fill) {
    poly(ctx, [x, y - r, x + r * 0.3, y - r * 0.3, x + r, y, x + r * 0.3, y + r * 0.3, x, y + r, x - r * 0.3, y + r * 0.3, x - r, y, x - r * 0.3, y - r * 0.3], fill, null);
  }
  function glow(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, col + '00');
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * (a == null ? 1 : a);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.globalAlpha = ga;
  }
  function crescent(ctx, x, y, r, fill, stroke, rot) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(-r * 1.5, 0, 0, r); ctx.quadraticCurveTo(-r * 0.6, 0, 0, -r); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.9; ctx.stroke(); }
    ctx.restore();
  }
  /** Orbiting items: draws only the half of the orbit that belongs to this layer. */
  function orbit(layer, n, speed, t, fn) {
    for (let i = 0; i < n; i++) {
      const a = t * speed + (i * TAU) / n, depth = Math.sin(a);
      if ((layer === 'under') === (depth < 0)) fn(Math.cos(a), depth, i);
    }
  }
  const releasedAt = (o, hit) => o.state === 'attack' && o.atkU > hit && o.atkU < 0.97;

  // ---------- weapons ----------
  function fist(ctx, h, o, back) {
    const fl = 0.7 + Math.sin(o.t * 25 + (back ? 2 : 0)) * 0.3;
    glow(ctx, h.x, h.y, 9 * fl, '#fb923c', back ? 0.35 : 0.55);
    circ(ctx, h.x, h.y, 4.8, back ? '#991b1b' : '#dc2626', back ? o.inkBack : o.ink, 1.4);
    circ(ctx, h.x - 1.3, h.y - 1.5, 1.3, 'rgba(255,220,180,.8)');
  }
  W.starfists = (ctx, J, o) => fist(ctx, J.hF, o, false);
  WB.starfists = (ctx, J, o) => fist(ctx, J.hB, o, true);

  W.aegis = (ctx, J, o) => {
    ctx.save(); ctx.translate(J.hF.x + 3, J.hF.y - 4); ctx.rotate((J.faF - 1.57) * 0.2);
    const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 14);
    g.addColorStop(0, '#d6d3d1'); g.addColorStop(1, '#57534e');
    circ(ctx, 0, 0, 13, g, o.ink, 2);
    ctx.strokeStyle = '#44403c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; seg(ctx, Math.cos(a) * 9.5, Math.sin(a) * 9.5, Math.cos(a) * 12, Math.sin(a) * 12, '#a8a29e', 1); }
    glow(ctx, 0, 0, 8, '#4ade80', 0.5 + Math.sin(o.t * 3) * 0.2);
    circ(ctx, 0, 0, 3.6, '#4ade80', o.ink, 1);
    ctx.restore();
  };

  W.chakram = (ctx, J, o) => {
    if (releasedAt(o, 0.55)) return;
    inHand(ctx, J, 0, c => {
      c.save(); c.translate(0, -7); c.rotate(o.t * 6);
      c.strokeStyle = '#93c5fd'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.stroke();
      c.strokeStyle = o.ink; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, 7.4, 0, TAU); c.stroke();
      star4(c, 0, 0, 3.6, '#eff6ff');
      c.restore();
    });
  };

  function claw(ctx, h, o, back, sc) {
    ctx.save(); ctx.translate(h.x + (back ? 1 : 3), h.y - 2); ctx.scale(sc, sc);
    const fill = back ? '#94a3b8' : '#cbd5e1', open = 0.25 + (o.state === 'attack' ? Math.sin(o.atkU * Math.PI) * 0.35 : 0);
    ctx.save(); ctx.rotate(-open);
    ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(4, -16, 14, -8); ctx.quadraticCurveTo(6, -8, 2, 0); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = back ? o.inkBack : o.ink; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.rotate(open);
    ctx.beginPath(); ctx.moveTo(-4, 2); ctx.quadraticCurveTo(4, 14, 13, 7); ctx.quadraticCurveTo(6, 7, 2, 0); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = back ? o.inkBack : o.ink; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
    circ(ctx, -3, 0, 5, fill, back ? o.inkBack : o.ink, 1.4);
    if (!back) glow(ctx, -3, 0, 9, '#93c5fd', 0.35);
    ctx.restore();
  }
  W.crabclaw = (ctx, J, o) => claw(ctx, J.hF, o, false, 1.15);
  WB.crabclaw = (ctx, J, o) => claw(ctx, J.hB, o, true, 0.9);

  W.sunblade = (ctx, J, o) => {
    inHand(ctx, J, 0, c => {
      seg(c, 0, 6, 0, -1, '#78350f', 2.8);
      poly(c, [-2.4, -2, 2.4, -2, 2, -27, 0, -31, -2, -27], '#fde047', o.ink, 1.1);
      seg(c, 0.6, -4, 0.6, -26, '#fff7c2', 0.9);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + o.t; seg(c, Math.cos(a) * 3, -1.8 + Math.sin(a) * 3, Math.cos(a) * 5.4, -1.8 + Math.sin(a) * 5.4, '#f59e0b', 1.1); }
      circ(c, 0, -1.8, 3, '#f59e0b', o.ink, 0.9);
    });
  };

  W.flowerstaff = (ctx, J, o) => {
    inHand(ctx, J, 0, c => {
      seg(c, 0, 12, 0, -27, '#e7e5e4', 2.4); seg(c, 0, 12, 0, -27, 'rgba(250,204,21,.6)', 0.8);
      glow(c, 0, -33, 12, '#86efac', 0.45 + Math.sin(o.t * 3) * 0.15);
      c.save(); c.translate(0, -33); c.rotate(o.t * 0.8);
      for (let i = 0; i < 5; i++) { c.save(); c.rotate((i / 5) * TAU); c.beginPath(); c.ellipse(0, -4.2, 2.3, 4, 0, 0, TAU); c.fillStyle = i % 2 ? '#bbf7d0' : '#f0fdf4'; c.fill(); c.strokeStyle = '#14532d'; c.lineWidth = 0.7; c.stroke(); c.restore(); }
      circ(c, 0, 0, 2, '#facc15', '#854d0e', 0.6);
      c.restore();
      for (let i = 0; i < 3; i++) star4(c, Math.cos(o.t + i * 2.1) * 9, -33 + Math.sin(o.t + i * 2.1) * 9, 1.4, '#ffffff');
    });
  };

  W.starbow = (ctx, J, o) => {
    W.bow(ctx, J, o);
    inHand(ctx, J, 0, c => {
      c.beginPath(); c.moveTo(0, -19); c.quadraticCurveTo(10, 0, 0, 19); c.strokeStyle = 'rgba(125,211,252,.85)'; c.lineWidth = 1.2; c.stroke();
      const tw = 2.4 + Math.sin(o.t * 6) * 0.6;
      star4(c, 0, -20, tw, '#e0f2fe'); star4(c, 0, 20, tw, '#e0f2fe');
    });
  };

  W.runestaff = (ctx, J, o) => {
    inHand(ctx, J, 0, c => {
      seg(c, 0, 12, 0, -26, '#1f2937', 2.6);
      for (const y of [-6, -14, -22]) seg(c, -1.6, y, 1.6, y - 2, '#2dd4bf', 1);
      glow(c, 0, -32, 11, '#2dd4bf', 0.5 + Math.sin(o.t * 4) * 0.2);
      poly(c, [0, -41, 4.6, -32, 0, -25, -4.6, -32], '#5eead4', o.ink, 1.1);
      seg(c, 0, -39, 0, -27, 'rgba(255,255,255,.7)', 0.8);
    });
  };

  W.vessel = (ctx, J, o) => {
    inHand(ctx, J, 0, c => {
      c.globalAlpha *= 0.85;
      c.beginPath(); c.ellipse(5, 0, 7, 6, 0, 0, TAU); c.fillStyle = 'rgba(165,243,252,.75)'; c.fill(); c.strokeStyle = '#0e7490'; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = 'rgba(103,232,249,.9)'; c.beginPath(); c.ellipse(5, 2, 5.4, 3.4, 0, 0, Math.PI); c.fill();
      c.fillStyle = 'rgba(165,243,252,.75)'; c.fillRect(11, -2.6, 4, 5.2); c.strokeRect(11, -2.6, 4, 5.2);
      c.beginPath(); c.ellipse(15.5, 0, 1.4, 3.6, 0, 0, TAU); c.fill(); c.stroke();
      c.globalAlpha = o.alpha;
      const pouring = o.state === 'attack' && o.atkU > 0.45 && o.atkU < 0.95;
      if (pouring) {
        c.strokeStyle = 'rgba(34,211,238,.85)'; c.lineWidth = 3; c.beginPath(); c.moveTo(16, 0); c.quadraticCurveTo(30, 2, 34, 18); c.stroke();
        c.strokeStyle = '#ecfeff'; c.lineWidth = 1; c.stroke();
      } else circ(c, 16.5, 2 + ((o.t * 3) % 1) * 7, 1.1, '#67e8f9');
    });
  };

  W.dreamorb = (ctx, J, o) => {
    inHand(ctx, J, 0, c => {
      glow(c, 0, -6, 12, '#f0abfc', 0.5 + Math.sin(o.t * 3) * 0.2);
      const g = c.createRadialGradient(-1.5, -7.5, 0.5, 0, -6, 5.2);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#f0abfc'); g.addColorStop(1, '#67e8f9');
      circ(c, 0, -6, 5.2, g, o.ink, 1);
    });
  };

  // ---------- headgear (head-local space) ----------
  HD.ramhorns = (c, o) => {
    const horn = (pts, back) => {
      c.beginPath(); c.moveTo(pts[0], pts[1]); c.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); c.bezierCurveTo(pts[8], pts[9], pts[10], pts[11], pts[12], pts[13]);
      c.strokeStyle = 'rgba(248,113,113,.35)'; c.lineWidth = 7; c.stroke();
      c.strokeStyle = o.ink; c.lineWidth = 4.6; c.stroke();
      c.strokeStyle = back ? '#991b1b' : '#ef4444'; c.lineWidth = 3; c.stroke();
    };
    horn([0, -6, -7, -16, -17, -8, -13, 0, -10, 5, -4, 4, -5, -1], true);
    horn([2, -6, 9, -16, 19, -7, 14, 1, 11, 5, 6, 3, 7, -1], false);
  };
  HD.bullhorns = (c, o) => {
    for (const sx of [-1, 1]) {
      c.beginPath(); c.moveTo(5 * sx, -5); c.quadraticCurveTo(21 * sx, -5, 20 * sx, -21); c.quadraticCurveTo(15 * sx, -10, 3 * sx, -8.5); c.closePath();
      c.fillStyle = sx < 0 ? '#a8a29e' : '#e7e5e4'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.4; c.stroke();
    }
    glow(c, 4, -4, 4, '#4ade80', 0.8); circ(c, 4, -4, 1.6, '#4ade80');
  };
  HD.geminiCrest = (c, o) => {
    const col = o.def.color || '#facc15', b = Math.sin(o.t * 4) * 1;
    star4(c, -4, -HR - 6 + b, 3.2, col); star4(c, 4, -HR - 8 - b, 2.6, '#ffffff');
    c.strokeStyle = col; c.lineWidth = 0.7; c.setLineDash([1, 1.5]); c.beginPath(); c.moveTo(-4, -HR - 6 + b); c.lineTo(4, -HR - 8 - b); c.stroke(); c.setLineDash([]);
  };
  HD.moonhelm = (c, o) => {
    c.beginPath(); c.arc(0, -0.5, HR + 1.3, Math.PI, 0); c.closePath();
    c.fillStyle = '#cbd5e1'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.5; c.stroke();
    glow(c, -1, -HR - 6, 8, '#bfdbfe', 0.6);
    crescent(c, -1, -HR - 6, 6, '#f8fafc', o.ink);
  };
  HD.suncrown = (c, o) => {
    poly(c, [-7, -HR + 2, -8, -HR - 5, -4, -HR - 1.5, 0, -HR - 8, 4, -HR - 1.5, 8, -HR - 5, 7, -HR + 2], '#fbbf24', o.ink, 1.2);
    circ(c, 0, -HR - 3.4, 2.4, '#f97316', o.ink, 0.8);
  };
  HD.leafhalo = (c, o) => {
    c.strokeStyle = 'rgba(134,239,172,.8)'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, -HR - 7, 10, 2.8, 0, 0, TAU); c.stroke();
    for (let i = 0; i < 7; i++) {
      const a = o.t * 0.9 + (i / 7) * TAU, x = Math.cos(a) * 10, y = -HR - 7 + Math.sin(a) * 2.8;
      c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 2.4, 1.2, 0, 0, TAU);
      c.fillStyle = i % 3 === 0 ? '#ffffff' : '#4ade80'; c.fill(); c.strokeStyle = '#14532d'; c.lineWidth = 0.5; c.stroke(); c.restore();
    }
  };
  HD.libraHalo = (c, o) => {
    c.save(); c.beginPath(); c.arc(0, 0, HR, 0, TAU); c.clip();
    c.fillStyle = '#fbbf24'; c.fillRect(-HR - 1, -6.4, HR * 2 + 2, 1.8); c.restore();
    star4(c, 0, -HR + 1.6, 2, '#fde68a');
  };
  HD.scorpHelm = (c, o) => {
    for (const [x, h] of [[-6, 6], [-2, 9], [2.5, 8], [6, 5]]) poly(c, [x - 2.2, -HR + 1.5, x, -HR - h, x + 2.2, -HR + 1.5], '#2e1065', '#a855f7', 0.9);
    c.beginPath(); c.arc(0, -0.5, HR + 1, Math.PI * 1.05, -0.05); c.strokeStyle = '#a855f7'; c.lineWidth = 1.2; c.stroke();
  };
  HD.goathorns = (c, o) => {
    c.beginPath(); c.moveTo(1, -7); c.bezierCurveTo(-4, -18, -16, -16, -19, -4);
    c.strokeStyle = o.ink; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#cbd5e1'; c.lineWidth = 3.4; c.stroke();
    for (let i = 1; i < 5; i++) { const t = i / 5, x = U.lerp(-1, -17, t), y = -13 - Math.sin(t * Math.PI) * 3 + t * 6; seg(c, x - 1, y - 1.5, x + 1, y + 1.5, '#64748b', 0.9); }
    glow(c, -18, -4, 5, '#2dd4bf', 0.7);
  };
  HD.aquaCrest = (c, o) => {
    c.save(); c.beginPath(); c.arc(0, 0, HR, 0, TAU); c.clip();
    c.strokeStyle = '#22d3ee'; c.lineWidth = 1.8; c.beginPath();
    for (let x = -HR; x <= HR; x += 2) c.lineTo(x, -5 + Math.sin(x * 0.9 + o.t * 6) * 1.2);
    c.stroke(); c.restore();
    c.beginPath(); c.moveTo(3, -HR - 5); c.quadraticCurveTo(6, -HR, 3, -HR + 1); c.quadraticCurveTo(0, -HR, 3, -HR - 5);
    c.fillStyle = '#67e8f9'; c.fill(); c.strokeStyle = '#0e7490'; c.lineWidth = 0.8; c.stroke();
  };
  HD.dreamHalo = (c, o) => {
    glow(c, 0, -HR - 6, 12, '#f0abfc', 0.35);
    c.lineWidth = 1.6;
    for (let i = 0; i < 2; i++) { c.strokeStyle = i ? '#67e8f9' : '#f0abfc'; c.beginPath(); c.ellipse(0, -HR - 6 - i * 1.5, 9 - i, 2.6, Math.sin(o.t * 2) * 0.1, 0, TAU); c.stroke(); }
  };

  // ---------- back items ----------
  BK.moonshell = (ctx, J, o) => {
    const p = torsoPt(J, 0.55);
    ctx.save(); ctx.translate(p.x - 8, p.y); ctx.rotate(J.lean);
    glow(ctx, 0, 0, 18, '#93c5fd', 0.35);
    ctx.beginPath(); ctx.moveTo(4, -14); ctx.quadraticCurveTo(-18, -6, 2, 14); ctx.quadraticCurveTo(-6, 0, 4, -14); ctx.closePath();
    ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.3; ctx.stroke();
    circ(ctx, -6, -2, 1.4, '#cbd5e1'); circ(ctx, -4, 5, 1, '#cbd5e1');
    ctx.restore();
  };

  // ---------- body / orbit layers (figure space) ----------
  function robe(ctx, J, o, fill, trim, deco) {
    const top = torsoPt(J, 0.5), hy = Math.max(J.fF.y, J.fB.y) - 5;
    const sway = Math.sin(o.t * 3) * 1;
    ctx.beginPath();
    ctx.moveTo(top.x - 5, top.y); ctx.lineTo(top.x + 5, top.y);
    ctx.quadraticCurveTo(J.hip.x + 9, J.hip.y + 4, J.hip.x + 12 + sway, hy);
    ctx.lineTo(J.hip.x - 12 + sway, hy);
    ctx.quadraticCurveTo(J.hip.x - 9, J.hip.y + 4, top.x - 5, top.y); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.4; ctx.stroke();
    seg(ctx, J.hip.x - 11.5 + sway, hy - 1.5, J.hip.x + 11.5 + sway, hy - 1.5, trim, 1.6);
    if (deco) for (const [dx, dy] of [[-5, 6], [4, 10], [-2, 15], [6, 2]]) star4(ctx, J.hip.x + dx, J.hip.y + dy - 4, 1.6, deco);
  }
  L.robeVirgo = (ctx, J, o) => robe(ctx, J, o, '#f8fafc', '#facc15', '#22c55e');
  L.robeLibra = (ctx, J, o) => robe(ctx, J, o, '#6b21a8', '#fbbf24', '#e9d5ff');

  L.ariesArmor = (ctx, J, o) => {
    const s = J.s;
    for (let i = 0; i < 3; i++) {
      const fl = Math.sin(o.t * 14 + i * 2) * 1.5, x = s.x - 3 + i * 3;
      poly(ctx, [x - 2.4, s.y - 2, x, s.y - 9 - i % 2 * 2 + fl, x + 2.4, s.y - 2], i === 1 ? '#fde047' : '#fb923c', null);
    }
    ctx.beginPath(); ctx.arc(s.x - 1, s.y + 1, 5.2, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = '#991b1b'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.2; ctx.stroke();
    const c = torsoPt(J, 0.55), pts = [[-3, 2], [-1, -1], [1.5, 0], [3, 3]];
    ctx.strokeStyle = 'rgba(253,224,71,.8)'; ctx.lineWidth = 0.7; ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(c.x + x, c.y + y) : ctx.moveTo(c.x + x, c.y + y))); ctx.stroke();
    for (const [x, y] of pts) circ(ctx, c.x + x, c.y + y, 0.9, '#fde047');
  };
  L.stonePlate = (ctx, J, o) => {
    const a = torsoPt(J, 0.25), b = torsoPt(J, 0.95);
    ctx.beginPath(); ctx.moveTo(a.x - 5, a.y); ctx.lineTo(b.x - 7, b.y); ctx.lineTo(b.x + 7, b.y); ctx.lineTo(a.x + 5, a.y); ctx.closePath();
    ctx.fillStyle = '#78716c'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.4; ctx.stroke();
    seg(ctx, b.x - 3, b.y + 3, b.x - 1, b.y + 8, '#44403c', 0.8); seg(ctx, a.x + 3, a.y - 2, a.x + 1, a.y - 6, '#44403c', 0.8);
    const c = torsoPt(J, 0.62);
    glow(ctx, c.x, c.y, 9, '#4ade80', 0.55 + Math.sin(o.t * 3) * 0.2);
    circ(ctx, c.x, c.y, 3.2, '#86efac', o.ink, 1);
  };
  L.tidalAura = (ctx, J, o) => {
    ctx.save(); ctx.translate(0, -28);
    ctx.strokeStyle = 'rgba(147,197,253,.45)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -o.t * 20;
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 32, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  };
  L.moonShards = (ctx, J, o, layer) => orbit(layer, 3, 1.4, o.t, (cx, d, i) => {
    ctx.globalAlpha = o.alpha * (d < 0 ? 0.55 : 1);
    crescent(ctx, cx * 22, -34 + d * 5 + Math.sin(o.t * 2 + i) * 3, 3.6, '#f1f5f9', '#64748b', o.t + i);
    ctx.globalAlpha = o.alpha;
  });
  L.sunmane = (ctx, J, o) => {
    const c = J.c;
    glow(ctx, c.x, c.y, 24, '#fde047', 0.55);
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(o.t * 0.4);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU, r2 = i % 2 ? 16 : 20;
      poly(ctx, [Math.cos(a - 0.17) * 8, Math.sin(a - 0.17) * 8, Math.cos(a) * r2, Math.sin(a) * r2, Math.cos(a + 0.17) * 8, Math.sin(a + 0.17) * 8], i % 2 ? '#f59e0b' : '#fbbf24', o.ink, 0.8);
    }
    ctx.restore();
  };
  L.libraSigil = (ctx, J, o) => {
    const c = J.c;
    glow(ctx, c.x - 2, c.y - 2, 20, '#c084fc', 0.5);
    ctx.save(); ctx.translate(c.x - 2, c.y - 2); ctx.rotate(Math.sin(o.t) * 0.2);
    ctx.strokeStyle = 'rgba(251,191,36,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.stroke();
    drawGlyph(ctx, 'libra', 0, 0, 20, '#fde68a', 6);
    ctx.restore();
  };
  L.orbitBlades = (ctx, J, o, layer) => orbit(layer, 2, 2.2, o.t, (cx, d) => {
    const x = cx * 24, y = -32 + d * 7;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.t * 8);
    ctx.globalAlpha = o.alpha * (d < 0 ? 0.6 : 1);
    poly(ctx, [0, -6, 2.2, 0, 0, 6, -1, 0], '#e9d5ff', o.ink, 0.8);
    ctx.restore(); ctx.globalAlpha = o.alpha;
  });
  L.floatScales = (ctx, J, o) => {
    const x = J.c.x - 15, y = J.c.y - 14 + Math.sin(o.t * 2) * 2, tilt = Math.sin(o.t * 1.3) * 0.25;
    glow(ctx, x, y, 14, '#fbbf24', 0.35);
    seg(ctx, x, y - 6, x, y + 4, '#b45309', 1.2);
    ctx.save(); ctx.translate(x, y - 6); ctx.rotate(tilt);
    seg(ctx, -9, 0, 9, 0, '#fbbf24', 1.6);
    for (const sx of [-9, 9]) {
      seg(ctx, sx, 0, sx - 3, 7, '#fbbf24', 0.6); seg(ctx, sx, 0, sx + 3, 7, '#fbbf24', 0.6);
      ctx.beginPath(); ctx.ellipse(sx, 7.5, 4, 1.6, 0, 0, Math.PI); ctx.fillStyle = '#fbbf24'; ctx.fill();
    }
    ctx.restore();
    circ(ctx, x, y - 6, 1.6, '#fde68a', '#b45309', 0.6);
  };
  L.exoPlates = (ctx, J, o) => {
    for (const f of [0.3, 0.55, 0.8]) {
      const p = torsoPt(J, f);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 5.5, 3.4, J.lean, 0, TAU);
      ctx.fillStyle = '#2e1065'; ctx.fill(); ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1; ctx.stroke();
    }
  };
  L.scorpTail = (ctx, J, o) => {
    const lunge = o.state === 'attack' ? Math.max(0, Math.sin(U.clamp((o.atkU - 0.35) / 0.4, 0, 1) * Math.PI)) : 0;
    const x0 = J.hip.x - 3, y0 = J.hip.y - 1;
    const x3 = J.c.x + 7 + lunge * 16, y3 = J.c.y - 17 + lunge * 10;
    const cx1 = x0 - 20, cy1 = y0 + 2, cx2 = J.c.x - 24, cy2 = J.c.y - 30;
    const N = 11;
    for (let i = 0; i <= N; i++) {
      const t = i / N, mt = 1 - t;
      const x = mt * mt * mt * x0 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x3;
      const y = mt * mt * mt * y0 + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * y3;
      circ(ctx, x, y, 3.6 - t * 1.6, i % 2 ? '#1e1033' : '#2e1065', '#7c3aed', 0.9);
    }
    glow(ctx, x3, y3, 8, '#c084fc', 0.6 + lunge * 0.4);
    poly(ctx, [x3 - 2, y3 - 2, x3 + 7, y3 + 3, x3 - 1, y3 + 3], '#e9d5ff', o.ink, 0.8);
  };
  const CENTAUR = [[-30, -40], [-22, -46], [-10, -44], [-4, -58], [2, -70], [-2, -50], [6, -52], [-26, -22], [-18, -24], [-8, -26], [-2, -20]];
  const CENTAUR_L = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [0, 7], [1, 8], [2, 9], [9, 10]];
  L.centaurStars = (ctx, J, o) => {
    ctx.save(); ctx.globalAlpha = o.alpha * 0.5;
    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (const [a, b] of CENTAUR_L) { ctx.moveTo(CENTAUR[a][0], CENTAUR[a][1]); ctx.lineTo(CENTAUR[b][0], CENTAUR[b][1]); }
    ctx.stroke();
    CENTAUR.forEach(([x, y], i) => star4(ctx, x, y, 1.6 + Math.sin(o.t * 3 + i) * 0.6, '#e0f2fe'));
    ctx.restore();
  };
  L.mountainArmor = (ctx, J, o) => {
    const s = J.s;
    poly(ctx, [s.x - 8, s.y + 3, s.x - 2, s.y - 9, s.x + 1, s.y - 5, s.x + 4, s.y - 8, s.x + 8, s.y + 3], '#475569', o.ink, 1.2);
    poly(ctx, [s.x - 4, s.y - 5, s.x - 2, s.y - 9, s.x, s.y - 6], '#f8fafc', null);
    const c = torsoPt(J, 0.5);
    seg(ctx, c.x - 2, c.y - 3, c.x + 2, c.y + 3, '#2dd4bf', 1); seg(ctx, c.x + 2, c.y - 3, c.x - 2, c.y + 3, '#2dd4bf', 1);
  };
  L.runeRock = (ctx, J, o) => {
    poly(ctx, [-17, 1, -13, -2, -4, -3, 6, -2.5, 15, -1.5, 18, 2, 10, 6, -10, 6], '#57534e', o.ink, 1.2);
    const p = 0.5 + Math.sin(o.t * 3) * 0.3;
    ctx.globalAlpha = o.alpha * p;
    for (const x of [-9, 0, 9]) { seg(ctx, x - 1.5, 0, x + 1.5, 3, '#5eead4', 1); seg(ctx, x + 1.5, 0, x - 1.5, 3, '#5eead4', 1); }
    ctx.globalAlpha = o.alpha;
  };
  L.floatRings = (ctx, J, o, layer) => {
    for (let i = 0; i < 2; i++) {
      ctx.save(); ctx.translate(0, -30 - i * 10); ctx.rotate(Math.sin(o.t + i) * 0.35 + (i ? 0.3 : -0.2));
      ctx.strokeStyle = i ? 'rgba(165,243,252,.9)' : 'rgba(34,211,238,.9)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (layer === 'under') ctx.ellipse(0, 0, 17 - i * 3, 5, 0, Math.PI, TAU); else ctx.ellipse(0, 0, 17 - i * 3, 5, 0, 0, Math.PI);
      ctx.stroke(); ctx.restore();
    }
  };
  L.fishOrbit = (ctx, J, o, layer) => orbit(layer, 2, 1.6, o.t, (cx, d, i) => {
    ctx.globalAlpha = o.alpha * (d < 0 ? 0.5 : 0.9);
    drawFish(ctx, cx * 22, -36 + d * 6, 4.2, -Math.sign(Math.sin(o.t * 1.6 + i * Math.PI)) || 1, o.t + i, i ? '#a5f3fc' : '#f0abfc');
    ctx.globalAlpha = o.alpha;
  });

  // ---------- astral fish ----------
  function drawFish(ctx, x, y, r, dir, t, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    glow(ctx, 0, 0, r * 2.6, col, 0.45);
    const wag = Math.sin(t * 12) * r * 0.35;
    poly(ctx, [-r * 0.9, 0, -r * 2, -r * 0.8 + wag, -r * 1.7, wag * 0.3, -r * 2, r * 0.8 + wag], col, '#4c1d95', r * 0.12);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.75, 0, 0, TAU);
    const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = r * 0.12; ctx.stroke();
    circ(ctx, r * 0.55, -r * 0.15, r * 0.18, '#1e1b4b');
    ctx.restore();
  }

  // ---------- glyphs, constellations, wheel ----------
  const paths = {};
  const glyphPath = id => paths[id] || (paths[id] = new Path2D(ZODIAC_BY_ID[id].glyph));
  /** Draw a sign glyph centred at (x,y), `size` px tall. lw = stroke width in glyph units (100 box). */
  function drawGlyph(ctx, id, x, y, size, color, lw, prog) {
    const k = size / 100, w = lw || 9;
    ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(k, k);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (prog != null && prog < 1) ctx.setLineDash([450 * Math.max(0, prog), 450]);
    ctx.strokeStyle = color + '55'; ctx.lineWidth = w * 2.4; ctx.stroke(glyphPath(id));
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(glyphPath(id));
    ctx.restore();
  }
  /** Constellation of a sign inside box (x,y,w,h). prog 0..1 draws stars then lines. */
  function drawConstellation(ctx, sign, x, y, w, h, prog, color, t) {
    const z = ZODIAC_BY_ID[sign], pts = z.stars.map(([a, b]) => [x + a * w, y + b * h]);
    const nS = pts.length, sp = U.clamp(prog * 2, 0, 1), lp = U.clamp(prog * 2 - 0.6, 0, 1.4) / 1.4;
    ctx.save(); ctx.lineCap = 'round';
    const nl = z.lines.length * lp;
    for (let i = 0; i < z.lines.length; i++) {
      if (i > nl) break;
      const f = Math.min(1, nl - i), [a, b] = z.lines[i], [x1, y1] = pts[a], [x2, y2] = pts[b];
      const ex = x1 + (x2 - x1) * f, ey = y1 + (y2 - y1) * f;
      ctx.strokeStyle = color + '55'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.stroke();
    }
    pts.forEach(([px, py], i) => {
      const app = U.clamp(sp * nS - i, 0, 1);
      if (app <= 0) return;
      const r = (4 + Math.sin(t * 4 + i) * 1.2) * U.easeOutBack(app);
      glow(ctx, px, py, r * 5, color, 0.8);
      star4(ctx, px, py, r * 1.6, '#ffffff');
      circ(ctx, px, py, r * 0.55, '#ffffff');
    });
    ctx.restore();
  }
  /** The great zodiac wheel; `rot` in radians, `sel` index highlighted (or -1). */
  function drawWheel(ctx, cx, cy, r, rot, sel, t, alpha) {
    ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha = alpha == null ? 1 : alpha;
    glow(ctx, 0, 0, r * 1.25, '#fbbf24', 0.25);
    ctx.rotate(rot);
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * TAU - Math.PI / 2 - TAU / 24, a1 = a0 + TAU / 12;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath();
      ctx.fillStyle = i === sel ? ZODIAC[i].color + 'cc' : i % 2 ? 'rgba(30,27,75,.85)' : 'rgba(49,46,129,.85)'; ctx.fill();
      ctx.strokeStyle = 'rgba(251,191,36,.7)'; ctx.lineWidth = 2; ctx.stroke();
      const am = (a0 + a1) / 2, gx = Math.cos(am) * r * 0.76, gy = Math.sin(am) * r * 0.76;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(am + Math.PI / 2);
      drawGlyph(ctx, ZODIAC[i].id, 0, 0, r * 0.2, i === sel ? '#ffffff' : '#fde68a', i === sel ? 10 : 7);
      ctx.restore();
    }
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.56, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, TAU); ctx.stroke();
    for (let i = 0; i < 72; i++) { const a = (i / 72) * TAU; seg(ctx, Math.cos(a) * (r + 2), Math.sin(a) * (r + 2), Math.cos(a) * (r + (i % 6 ? 6 : 10)), Math.sin(a) * (r + (i % 6 ? 6 : 10)), '#fbbf24', 1.2); }
    ctx.rotate(-rot * 2.2);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; star4(ctx, Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34, 5, '#fde68a'); }
    glow(ctx, 0, 0, r * 0.3, '#fef3c7', 0.7);
    star4(ctx, 0, 0, r * 0.16, '#ffffff');
    ctx.restore();
  }
  /** Inline SVG of a glyph for DOM badges. */
  function glyphSVG(id, color, size) {
    return `<svg class="zglyph" viewBox="0 0 100 100" width="${size || 18}" height="${size || 18}"><path d="${ZODIAC_BY_ID[id].glyph}" fill="none" stroke="${color || '#fde68a'}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  return { drawGlyph, drawConstellation, drawWheel, drawFish, glyphSVG, star4, glow };
})();

/* Preview-only ghost of Gemini's blue twin (in battle the twin is a real unit). */
Stick.LAYER.twinGhost = (ctx, J, o) => {
  if (!o.preview || !ZODIAC_SPAWNED) return;
  const tw = ZODIAC_SPAWNED.gemTwin;
  Stick.draw(ctx, { x: -17, y: 0, s: 0.92, dir: 1, pose: Object.assign({}, o.pose, { shF: o.pose.shB, shB: o.pose.shF, elF: o.pose.elB, elB: o.pose.elF }),
    look: tw.look, def: tw, team: 0, t: o.t + 0.5, alpha: o.alpha * 0.8, flash: false, state: 'idle', atkU: -1, dead: false, color: tw.color, seed: 2 });
};
