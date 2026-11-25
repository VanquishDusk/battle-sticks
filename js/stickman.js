'use strict';
/* =========================================================
   Stickman renderer.
   A stickman is a tiny skeleton (hip, knees, feet, shoulders,
   elbows, hands, head) solved with forward kinematics from a
   pose of joint angles. Angles are measured from "straight
   down", positive = towards the facing direction, so
   pi/2 points forward and pi points straight up.
   Accessories / weapons are drawn on top of the skeleton.
   ========================================================= */

const Stick = (() => {
  const TH = 12, SH = 12, TO = 21, UA = 10.5, FA = 10.5, HR = 8.5, NK = 2.2;
  const INK = '#161616', INK_BACK = '#4d4d4d', FLASH = '#ff3030', FLASH_BACK = '#ff8a8a';
  const KB_DUR = 0.55;
  /** Blend two #rrggbb colours. */
  function mixHex(a, b, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  const BASE = { bx: 0, lean: 0.05, hipF: 0.1, kneeF: 0.06, hipB: -0.1, kneeB: 0.06, shF: 0.2, elF: 0.3, shB: -0.16, elB: 0.3, head: 0, rot: 0, hop: 0 };
  const KEYS = Object.keys(BASE);
  const P = (o, b) => Object.assign({}, b || BASE, o);
  const STANCE = P({ hipF: 0.34, kneeF: 0.32, hipB: -0.3, kneeB: 0.24, shF: 0.95, elF: 1.35, shB: 0.72, elB: 1.55, lean: 0.14 });
  const S = o => P(o, STANCE);

  /* Attack animations: keyframes [time 0..1, pose]; `hit` = when damage lands. */
  const ANIMS = {
    slash: { hit: 0.55, k: [[0, STANCE], [0.42, S({ shF: 2.95, elF: 0.25, shB: 0.35, elB: 1.1, lean: -0.1, bx: -1 })], [0.6, S({ shF: 0.45, elF: 0.05, shB: -0.25, elB: 0.6, lean: 0.36, bx: 4 })], [1, STANCE]] },
    punch: { hit: 0.5, k: [[0, STANCE], [0.32, S({ shF: 0.45, elF: 2.35, lean: -0.06, bx: -2 })], [0.48, S({ shF: 1.6, elF: 0, lean: 0.4, bx: 5, shB: 0.85, elB: 1.9 })], [0.72, S({ shF: 1.25, elF: 0.45, lean: 0.22, bx: 3 })], [1, STANCE]] },
    bash: { hit: 0.55, k: [[0, S({ shF: 0.75, elF: 0.55 })], [0.4, S({ shF: 0.6, elF: 0.9, lean: -0.18, bx: -4 })], [0.56, S({ shF: 1.25, elF: 0.25, lean: 0.42, bx: 8 })], [1, S({ shF: 0.75, elF: 0.55 })]] },
    bow: {
      hit: 0.72, rest: S({ shF: 1.5, elF: 0, shB: 1.3, elB: 1.3, lean: 0.02 }),
      k: [[0, S({ shF: 1.5, elF: 0, shB: 1.3, elB: 1.3, lean: 0.02 })], [0.68, S({ shF: 1.52, elF: 0, shB: 1.45, elB: 3.0, lean: -0.04, head: -0.05 })], [0.76, S({ shF: 1.55, elF: 0, shB: 1.1, elB: 0.9, lean: 0.03 })], [1, S({ shF: 1.5, elF: 0, shB: 1.3, elB: 1.3, lean: 0.02 })]],
    },
    throw: { hit: 0.55, k: [[0, STANCE], [0.45, S({ shF: 3.5, elF: 0.7, shB: 1.2, elB: 0.5, lean: -0.22, bx: -2 })], [0.6, S({ shF: 1.1, elF: 0.15, shB: -0.3, lean: 0.36, bx: 4 })], [1, STANCE]] },
    staff: { hit: 0.62, rest: S({ shF: 0.4, elF: 0.9 }), k: [[0, S({ shF: 0.4, elF: 0.9 })], [0.5, S({ shF: 2.7, elF: 0.15, shB: 1.8, elB: 0.5, lean: -0.12, head: -0.15 })], [0.66, S({ shF: 1.55, elF: 0, lean: 0.25, bx: 3 })], [1, S({ shF: 0.4, elF: 0.9 })]] },
    stab: { hit: 0.55, rest: S({ shF: 0.25, elF: 0.1 }), k: [[0, S({ shF: 0.25, elF: 0.1 })], [0.4, S({ shF: -0.3, elF: 0.2, lean: -0.08, bx: -6 })], [0.55, S({ shF: 0.3, elF: 0, lean: 0.45, bx: 12, hipF: 0.6, kneeF: 0.4 })], [0.8, S({ shF: 0.25, elF: 0.05, lean: 0.2, bx: 5 })], [1, S({ shF: 0.25, elF: 0.1 })]] },
    slam: { hit: 0.66, k: [[0, STANCE], [0.55, S({ shF: 3.05, elF: 0.2, shB: 2.95, elB: 0.25, lean: -0.26, head: -0.1 })], [0.68, S({ shF: 0.55, elF: 0.1, shB: 0.5, elB: 0.1, lean: 0.55, bx: 5, hipF: 0.55, kneeF: 0.7, hipB: -0.45, kneeB: 0.6 })], [0.85, S({ shF: 0.6, elF: 0.15, shB: 0.55, lean: 0.45, bx: 4, hipF: 0.5, kneeF: 0.6 })], [1, STANCE]] },
    sweep: { hit: 0.55, k: [[0, STANCE], [0.4, S({ shF: -0.7, elF: 0.4, shB: -0.4, lean: -0.15, bx: -3 })], [0.58, S({ shF: 2.3, elF: 0.1, shB: 1.6, elB: 0.3, lean: 0.4, bx: 6 })], [1, STANCE]] },
    ninja: { hit: 0.5, k: [[0, STANCE], [0.25, S({ shF: 2.7, elF: 0.3, lean: 0 })], [0.5, S({ shF: 0.2, elF: 0.05, lean: 0.5, bx: 7, shB: -0.8 })], [0.75, S({ shF: 1.8, elF: 1.2, lean: 0.25, bx: 4 })], [1, STANCE]] },
    heal: { hit: 0.5, rest: S({ shF: 0.4, elF: 0.9 }), k: [[0, S({ shF: 0.4, elF: 0.9 })], [0.45, S({ shF: 2.85, elF: 0.1, shB: 2.2, elB: 0.4, head: -0.2, lean: -0.05 })], [0.6, S({ shF: 2.9, elF: 0.05, shB: 2.3, elB: 0.3, head: -0.22 })], [1, S({ shF: 0.4, elF: 0.9 })]] },
    drum: { hit: 0.5, k: [[0, S({ shF: 1.25, elF: 1.7, shB: 0.6, elB: 0.9 })], [0.5, S({ shF: 0.6, elF: 0.9, shB: 1.2, elB: 1.7 })], [1, S({ shF: 1.25, elF: 1.7, shB: 0.6, elB: 0.9 })]] },
    build: { hit: 0.68, k: [[0, STANCE], [0.5, S({ shF: 2.9, elF: 0.3, lean: 0.25, hipF: 0.9, kneeF: 1.7, hipB: -0.5, kneeB: 1.3, head: 0.2 })],
      [0.7, S({ shF: 0.25, elF: 0.1, lean: 0.5, hipF: 0.9, kneeF: 1.7, hipB: -0.5, kneeB: 1.3, head: 0.3 })], [0.85, S({ shF: 0.4, elF: 0.2, lean: 0.45, hipF: 0.9, kneeF: 1.7, hipB: -0.5, kneeB: 1.3 })], [1, STANCE]] },
    sting: { hit: 0.58, k: [[0, STANCE], [0.42, S({ lean: -0.35, shF: 0.5, elF: 1.7, shB: 0.3, elB: 1.7, hipF: 0.45, kneeF: 0.6, bx: -3 })],
      [0.6, S({ lean: 0.5, bx: 8, shF: 1.3, elF: 0.3, shB: 1.1, elB: 0.5 })], [1, STANCE]] },
    pour: { hit: 0.6, rest: S({ shF: 0.9, elF: 1.0 }), k: [[0, S({ shF: 0.9, elF: 1.0 })], [0.42, S({ shF: 2.7, elF: 0.5, shB: 2.0, elB: 0.6, lean: -0.15, head: -0.15 })],
      [0.62, S({ shF: 1.7, elF: -0.1, shB: 1.4, elB: 0.2, lean: 0.35, bx: 4 })], [1, S({ shF: 0.9, elF: 1.0 })]] },
    balance: { hit: 0.55, rest: S({ shF: 1.35, elF: 0.2, shB: 1.25, elB: 0.25, lean: 0 }),
      k: [[0, S({ shF: 1.35, elF: 0.2, shB: 1.25, elB: 0.25, lean: 0 })], [0.5, S({ shF: 2.6, elF: 0.1, shB: 2.4, elB: 0.1, lean: -0.1, head: -0.2 })], [1, S({ shF: 1.35, elF: 0.2, shB: 1.25, elB: 0.25, lean: 0 })]] },
    fuse: { hit: 0.95, k: [[0, STANCE], [0.9, S({ shF: 2.6, elF: 0.5, shB: 2.4, elB: 0.5, lean: 0.3 })], [1, S({ shF: 2.6, elF: 0.5, shB: 2.4, elB: 0.5, lean: 0.3 })]] },
  };
  const KB_POSE = P({ lean: -0.42, shF: 2.3, elF: 0.5, shB: 1.9, elB: 0.6, hipF: 0.75, kneeF: 1.0, hipB: 0.35, kneeB: 0.7, head: -0.2 });
  const DEAD_POSE = P({ lean: -0.15, shF: 2.7, elF: 0.2, shB: 2.4, elB: 0.3, hipF: 0.35, kneeF: 0.15, hipB: 0.15, kneeB: 0.1, head: -0.3 });
  const CHEER_POSE = P({ shF: 2.7, elF: 0.3, shB: 2.5, elB: 0.3, lean: -0.05, head: -0.15 });

  function lerpPose(a, b, t, out) {
    for (let i = 0; i < KEYS.length; i++) { const k = KEYS[i]; out[k] = a[k] + (b[k] - a[k]) * t; }
    return out;
  }
  function animPose(A, u, out) {
    const k = A.k;
    u = U.clamp(u, 0, 1);
    let i = 0;
    while (i < k.length - 2 && u > k[i + 1][0]) i++;
    const a = k[i], b = k[i + 1];
    const t = U.clamp((u - a[0]) / Math.max(1e-6, b[0] - a[0]), 0, 1);
    return lerpPose(a[1], b[1], U.easeInOut(t), out);
  }
  function walkPose(ph, d, out) {
    Object.assign(out, BASE);
    const s = Math.sin(ph), c = Math.cos(ph);
    const run = d.run === 'run';
    const amp = run ? 0.8 : d.heavy ? 0.42 : 0.55;
    out.hipF = amp * s; out.hipB = -amp * s;
    out.kneeF = 0.08 + Math.max(0, c) * (run ? 1.4 : 0.95);
    out.kneeB = 0.08 + Math.max(0, -c) * (run ? 1.4 : 0.95);
    if (run) {
      out.lean = 0.45; out.shF = -1.0 + 0.25 * s; out.elF = 0.35; out.shB = -1.2 - 0.25 * s; out.elB = 0.3;
    } else {
      out.lean = d.heavy ? 0.06 : 0.12;
      out.shF = -0.55 * s + 0.12; out.elF = 0.45; out.shB = 0.55 * s + 0.12; out.elB = 0.45;
    }
    if (d.hold) Object.assign(out, d.hold);
    if (d.loopAnim) loopArms(d, ph / Math.PI, out);
    return out;
  }
  const _loop = Object.assign({}, BASE);
  /** Units like the drummer keep playing their animation with their arms. */
  function loopArms(d, u, out) {
    animPose(ANIMS[d.anim], ((u % 1) + 1) % 1, _loop);
    out.shF = _loop.shF; out.elF = _loop.elF; out.shB = _loop.shB; out.elB = _loop.elB;
  }
  function idlePose(d, t, seed, out) {
    const A = ANIMS[d.anim] || ANIMS.slash;
    Object.assign(out, A.rest || STANCE);
    if (!A.rest && d.hold) Object.assign(out, d.hold);
    out.lean += Math.sin(t * 4 + seed) * 0.03;
    out.shF += Math.sin(t * 4 + seed) * 0.04;
    if (d.loopAnim) loopArms(d, t * 1.8 + seed, out);
    return out;
  }

  /** Pose for a battle unit, written into `out`. */
  function unitPose(u, t, out) {
    const d = u.def;
    switch (u.state) {
      case 'walk': return walkPose(u.phase, d, out);
      case 'attack': return animPose(ANIMS[d.anim] || ANIMS.slash, u.atkT / u.animDur, out);
      case 'kb': {
        const k = U.clamp(u.kbT / KB_DUR, 0, 1);
        Object.assign(out, KB_POSE);
        out.rot = -0.45 * Math.sin(Math.PI * k);
        out.hop = Math.sin(Math.PI * k) * 16;
        return out;
      }
      case 'dead': {
        const k = U.clamp(u.deadT / 0.5, 0, 1);
        Object.assign(out, DEAD_POSE);
        out.rot = -1.45 * U.easeOutCubic(k);
        out.hop = Math.sin(Math.PI * k) * 12;
        return out;
      }
      case 'cheer': {
        Object.assign(out, CHEER_POSE);
        const w = Math.sin(t * 9 + u.seed);
        out.shF += w * 0.35; out.shB -= w * 0.35;
        out.hop = Math.abs(Math.sin(t * 6 + u.seed)) * 8;
        return out;
      }
      default: {
        idlePose(d, t, u.seed, out);
        if (u.stunT > 0) { out.head = Math.sin(t * 10) * 0.25; out.lean = -0.1; out.shF = 0.2; out.shB = 0.1; out.elF = 0.2; out.elB = 0.2; }
        return out;
      }
    }
  }

  // ---------- forward kinematics ----------
  function solve(p) {
    const sl = Math.sin(p.lean), cl = Math.cos(p.lean);
    const hx = p.bx, hy = -(TH + SH);
    const aF = p.hipF - p.kneeF, aB = p.hipB - p.kneeB;
    const kFx = hx + Math.sin(p.hipF) * TH, kFy = hy + Math.cos(p.hipF) * TH;
    const fFx = kFx + Math.sin(aF) * SH, fFy = kFy + Math.cos(aF) * SH;
    const kBx = hx + Math.sin(p.hipB) * TH, kBy = hy + Math.cos(p.hipB) * TH;
    const fBx = kBx + Math.sin(aB) * SH, fBy = kBy + Math.cos(aB) * SH;
    const dy = -Math.max(fFy, fBy); // keep the lowest foot on the ground
    const sx = hx + sl * (TO - 2), sy = hy - cl * (TO - 2) + dy;
    const nx = hx + sl * TO, ny = hy - cl * TO + dy;
    const ha = p.lean + p.head;
    const faF = p.shF + p.elF, faB = p.shB + p.elB;
    const eFx = sx + Math.sin(p.shF) * UA, eFy = sy + Math.cos(p.shF) * UA;
    const eBx = sx + Math.sin(p.shB) * UA, eBy = sy + Math.cos(p.shB) * UA;
    return {
      hip: { x: hx, y: hy + dy }, neck: { x: nx, y: ny }, s: { x: sx, y: sy },
      c: { x: nx + Math.sin(ha) * (NK + HR), y: ny - Math.cos(ha) * (NK + HR) }, ha,
      kF: { x: kFx, y: kFy + dy }, fF: { x: fFx, y: fFy + dy },
      kB: { x: kBx, y: kBy + dy }, fB: { x: fBx, y: fBy + dy },
      eF: { x: eFx, y: eFy }, hF: { x: eFx + Math.sin(faF) * FA, y: eFy + Math.cos(faF) * FA },
      eB: { x: eBx, y: eBy }, hB: { x: eBx + Math.sin(faB) * FA, y: eBy + Math.cos(faB) * FA },
      faF, faB, lean: p.lean,
    };
  }

  // ---------- drawing helpers ----------
  function limb(ctx, a, b, c, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
  }
  function seg(ctx, x1, y1, x2, y2, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function circ(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.4; ctx.stroke(); }
  }
  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.4; ctx.stroke(); }
  }
  /** Enter the hand's frame: +x along the forearm, -y "up" when the arm points forward. */
  function inHand(ctx, J, back, fn, o) {
    const h = back ? J.hB : J.hF, a = back ? J.faB : J.faF;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(Math.atan2(Math.cos(a), Math.sin(a)));
    fn(ctx, o); ctx.restore();
  }
  const releasedRecently = o => o.state === 'attack' && o.atkU > (ANIMS[o.def.anim] || ANIMS.slash).hit && o.atkU < 0.97;

  // ---------- weapons ----------
  const WPN = {
    twig(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 4, 0, -1, '#7a4a22', 3);
        poly(c, [-1.9, -2, 1.9, -2, 1.4, -15, 0, -18.5, -1.4, -15], '#e4eaf0', o.ink, 1.2);
        seg(c, -4.2, -2, 4.2, -2, o.ink, 2.3);
      });
    },
    katana(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 6, 0, -1, '#222', 2.8);
        c.beginPath(); c.moveTo(-1.1, -2); c.quadraticCurveTo(-0.6, -16, 3.2, -30); c.quadraticCurveTo(1.6, -15, 1.3, -2); c.closePath();
        c.fillStyle = '#f1f5f9'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1; c.stroke();
        circ(c, 0, -1.5, 2.2, '#c9a227', o.ink, 0.8);
      });
    },
    club(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 5, 0, -4, '#6b4220', 3);
        c.beginPath(); c.moveTo(-1.8, -3); c.quadraticCurveTo(-5.2, -14, -3.4, -19.5); c.quadraticCurveTo(0, -23, 3.4, -19.5); c.quadraticCurveTo(5.2, -14, 1.8, -3); c.closePath();
        c.fillStyle = '#9a6233'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.4; c.stroke();
        seg(c, -2, -12, 1, -11, '#6b4220', 1); seg(c, 0, -16, 2.5, -16.5, '#6b4220', 1);
      });
    },
    bigclub(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        c.scale(1.6, 1.6);
        seg(c, 0, 5, 0, -4, '#5c3818', 3);
        c.beginPath(); c.moveTo(-2, -3); c.quadraticCurveTo(-6.2, -15, -4.4, -22); c.quadraticCurveTo(0, -26, 4.4, -22); c.quadraticCurveTo(6.2, -15, 2, -3); c.closePath();
        c.fillStyle = '#8a5528'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.3; c.stroke();
        const sp = [[-5.4, -16, -9, -17], [5.4, -15, 9, -16], [-4.2, -21, -7, -24.5], [4.2, -21, 7, -24.5], [0, -24.5, 0, -28.5]];
        for (const s of sp) poly(c, [s[0] - 1.2, s[1] + 1, s[0] + 1.2, s[1] - 1, s[2], s[3]], '#d6d3d1', o.ink, 0.8);
      });
    },
    axe(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 9, 0, -36, '#6b4220', 2.8);
        poly(c, [0.5, -23, 9, -21, 16, -29, 15, -37, 10, -42, 0.5, -36], '#d4dbe3', o.ink, 1.3);
        seg(c, 6, -24, 12, -36, '#ffffff', 1);
        poly(c, [-0.5, -30, -6, -32, -0.5, -35], '#9aa3ad', o.ink, 1);
      });
    },
    hammer(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 12, 0, -34, '#5c3818', 3);
        U.rrect(c, -13, -46, 26, 15, 3); c.fillStyle = '#8b9099'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.5; c.stroke();
        seg(c, -7, -46, -7, -31, '#5f646c', 1.6); seg(c, 7, -46, 7, -31, '#5f646c', 1.6);
      });
    },
    scythe(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 14, 0, -46, '#2b1d3a', 2.6);
        c.beginPath(); c.moveTo(0, -46); c.quadraticCurveTo(19, -51, 31, -35); c.quadraticCurveTo(16, -42, 1, -40); c.closePath();
        c.fillStyle = '#c4b5fd'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.2; c.stroke();
        circ(c, 0, -46, 2.2, '#a855f7', o.ink, 0.8);
      });
    },
    sword(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 5, 0, -1, '#3b2a1a', 2.8);
        poly(c, [-2.3, -2, 2.3, -2, 1.9, -24, 0, -28, -1.9, -24], '#d7dde5', o.ink, 1.2);
        seg(c, -5.2, -1.8, 5.2, -1.8, '#8a6d1f', 2.6);
      });
    },
    spear(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 22, 0, -40, '#7a4a22', 2.3);
        poly(c, [-2.8, -40, 2.8, -40, 0, -53], '#e2e8f0', o.ink, 1.2);
        poly(c, [-2, -38, 2, -38, 3, -33, -3, -33], '#dc2626', null);
      });
    },
    staff(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 12, 0, -28, '#8b5a2b', 2.6);
        const charge = o.state === 'attack' && o.atkU < 0.7 ? o.atkU / 0.7 : 0;
        const r = 4.6 + charge * 2.5;
        c.globalAlpha *= 0.35 + 0.25 * Math.sin(o.t * 6);
        circ(c, 0, -32, r + 3 + charge * 4, '#c4b5fd');
        c.globalAlpha = o.alpha;
        const g = c.createRadialGradient(-1.5, -33.5, 0.5, 0, -32, r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#d8b4fe'); g.addColorStop(1, '#7c3aed');
        circ(c, 0, -32, r, g, o.ink, 1);
      });
    },
    hexstaff(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 12, 0, -27, '#4a2f18', 2.6);
        c.globalAlpha *= 0.35 + 0.25 * Math.sin(o.t * 5);
        circ(c, 0, -31, 8, '#4ade80');
        c.globalAlpha = o.alpha;
        circ(c, 0, -31, 4.2, '#f5f5f4', o.ink, 1);
        circ(c, 1.2, -31.5, 1, '#16a34a'); circ(c, -1.3, -31.5, 1, '#16a34a');
      });
    },
    wand(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 4, 0, -13, '#e5e7eb', 2.4);
        circ(c, 0, -17, 4.6, '#ffffff', o.ink, 1.2);
        c.fillStyle = '#ef4444'; c.fillRect(-1.1, -20, 2.2, 6); c.fillRect(-3, -18.1, 6, 2.2);
      });
    },
    bow(ctx, J, o) {
      // bow limbs in hand frame
      const a = Math.atan2(Math.cos(J.faF), Math.sin(J.faF));
      const ca = Math.cos(a), sa = Math.sin(a);
      const tip = (lx, ly) => ({ x: J.hF.x + lx * ca - ly * sa, y: J.hF.y + lx * sa + ly * ca });
      const t1 = tip(0, -19), t2 = tip(0, 19);
      const drawing = o.state === 'attack' && o.atkU < 0.72;
      const sp = drawing ? J.hB : { x: (t1.x + t2.x) / 2 - 1, y: (t1.y + t2.y) / 2 };
      ctx.strokeStyle = '#e7e5e4'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(sp.x, sp.y); ctx.lineTo(t2.x, t2.y); ctx.stroke();
      if (drawing && o.atkU > 0.15) {
        const fx = J.hF.x + 5 * ca, fy = J.hF.y + 5 * sa;
        seg(ctx, J.hB.x, J.hB.y, fx, fy, '#8b5a2b', 1.4);
        poly(ctx, [fx + 3 * ca, fy + 3 * sa, fx - 1.5 * sa, fy + 1.5 * ca, fx + 1.5 * sa, fy - 1.5 * ca], '#cbd5e1', null);
      }
      inHand(ctx, J, 0, c => {
        c.beginPath(); c.moveTo(0, -19); c.quadraticCurveTo(10, 0, 0, 19);
        c.strokeStyle = o.ink; c.lineWidth = 3.4; c.stroke();
        c.strokeStyle = '#a16207'; c.lineWidth = 2; c.stroke();
      });
    },
    gloves(ctx, J, o) {
      circ(ctx, J.hF.x, J.hF.y, 4.9, '#e11d48', o.ink, 1.5);
      circ(ctx, J.hF.x - 1.4, J.hF.y - 1.6, 1.4, 'rgba(255,255,255,.7)');
    },
    shield(ctx, J, o) {
      ctx.save();
      ctx.translate(J.hF.x + 2.5, J.hF.y - 3);
      ctx.rotate((J.faF - 1.57) * 0.22);
      U.rrect(ctx, -7, -18, 14, 33, 6);
      const g = ctx.createLinearGradient(-7, 0, 7, 0);
      g.addColorStop(0, '#94a3b8'); g.addColorStop(0.5, '#e2e8f0'); g.addColorStop(1, '#94a3b8');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = o.color || '#3b82f6'; ctx.fillRect(-5.5, -4, 11, 5);
      circ(ctx, 0, -1.5, 2.6, '#fbbf24', o.ink, 1);
      ctx.restore();
    },
    bomb(ctx, J, o) {
      if (releasedRecently(o)) return;
      inHand(ctx, J, 0, c => bombShape(c, 0, -4, 5.4, o));
    },
    pencil(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        poly(c, [-3.2, 4, 0, 14, 3.2, 4], '#f5d0a0', o.ink, 1.1);
        poly(c, [-1.1, 10.6, 0, 14, 1.1, 10.6], '#374151', null);
        c.fillStyle = '#facc15'; c.fillRect(-3.2, -40, 6.4, 44); c.strokeStyle = o.ink; c.lineWidth = 1.2; c.strokeRect(-3.2, -40, 6.4, 44);
        seg(c, -1, -38, -1, 2, '#ca8a04', 1); seg(c, 1.2, -38, 1.2, 2, '#fde68a', 1);
        c.fillStyle = '#cbd5e1'; c.fillRect(-3.6, -45, 7.2, 5.5); c.strokeRect(-3.6, -45, 7.2, 5.5);
        U.rrect(c, -3.6, -54, 7.2, 10, 2.5); c.fillStyle = '#f472b6'; c.fill(); c.stroke();
      });
    },
    drumsticks(ctx, J, o) {
      inHand(ctx, J, 0, c => { seg(c, 0, 2, 0, -13, '#a16207', 1.8); circ(c, 0, -14, 2, '#fef3c7', o.ink, 0.9); });
    },
    brush(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 9, 0, -21, '#92400e', 2.4);
        c.fillStyle = '#cbd5e1'; c.fillRect(-2.2, -26, 4.4, 5); c.strokeStyle = o.ink; c.lineWidth = 0.9; c.strokeRect(-2.2, -26, 4.4, 5);
        c.beginPath(); c.moveTo(-2.4, -26); c.quadraticCurveTo(-4, -33, 0, -39); c.quadraticCurveTo(4, -33, 2.4, -26); c.closePath();
        c.fillStyle = '#1d4ed8'; c.fill(); c.stroke();
        circ(c, 0.6, -24 + ((o.t * 2) % 1) * 10, 1.2, '#1d4ed8');
      });
    },
    clockstaff(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 12, 0, -26, '#3f2a1a', 2.4);
        c.globalAlpha *= 0.3 + 0.2 * Math.sin(o.t * 5); circ(c, 0, -34, 12, '#7dd3fc'); c.globalAlpha = o.alpha;
        circ(c, 0, -34, 7.5, '#fef9c3', '#b45309', 2);
        for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; seg(c, Math.cos(a) * 5.6, -34 + Math.sin(a) * 5.6, Math.cos(a) * 6.6, -34 + Math.sin(a) * 6.6, '#78350f', 0.7); }
        const a1 = -o.t * 3, a2 = -o.t * 0.4;
        seg(c, 0, -34, Math.cos(a1) * 5.5, -34 + Math.sin(a1) * 5.5, '#111', 1);
        seg(c, 0, -34, Math.cos(a2) * 3.8, -34 + Math.sin(a2) * 3.8, '#111', 1.4);
      });
    },
    mallet(ctx, J, o) {
      inHand(ctx, J, 0, c => {
        seg(c, 0, 5, 0, -12, '#92400e', 2.4);
        U.rrect(c, -7, -19, 14, 8, 2); c.fillStyle = '#d6a15c'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.2; c.stroke();
      });
    },
    rock(ctx, J, o) {
      if (releasedRecently(o)) return;
      inHand(ctx, J, 0, c => poly(c, [-3.5, -1, -2.5, -5.5, 1.5, -6.5, 4, -3, 2.5, 0.5, -1, 1], '#8d8a85', o.ink, 1.1));
    },
  };
  function bombShape(c, x, y, r, o) {
    circ(c, x, y, r, '#26262b', o.ink, 1.2);
    circ(c, x - r * 0.35, y - r * 0.35, r * 0.28, 'rgba(255,255,255,.55)');
    c.strokeStyle = '#a16207'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x + r * 0.4, y - r * 0.9); c.quadraticCurveTo(x + r * 0.9, y - r * 1.6, x + r * 0.5, y - r * 2); c.stroke();
    const fl = 0.8 + Math.sin(o.t * 30) * 0.4;
    circ(c, x + r * 0.5, y - r * 2, 1.8 * fl, '#fde047');
    circ(c, x + r * 0.5, y - r * 2, 1 * fl, '#fff');
  }

  // ---------- off-hand & back items ----------
  const OFF = {
    kshield(ctx, J, o) {
      ctx.save(); ctx.translate(J.hB.x + 1, J.hB.y - 2);
      poly(ctx, [-6, -11, 6, -11, 6, 2, 0, 11, -6, 2], '#7f1d1d', o.inkBack, 1.6);
      poly(ctx, [-2, -8, 2, -8, 2, 4, 0, 7, -2, 4], '#1f1f1f', null);
      ctx.restore();
    },
  };
  function torsoPt(J, f) { return { x: J.hip.x + (J.neck.x - J.hip.x) * f, y: J.hip.y + (J.neck.y - J.hip.y) * f }; }
  const BACK = {
    quiver(ctx, J, o) {
      const p = torsoPt(J, 0.6);
      ctx.save(); ctx.translate(p.x - 4, p.y); ctx.rotate(J.lean - 0.45);
      U.rrect(ctx, -3, -12, 6, 21, 2); ctx.fillStyle = '#8b5a2b'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.2; ctx.stroke();
      for (let i = 0; i < 3; i++) poly(ctx, [-2 + i * 2, -12, -3 + i * 2, -17, -1 + i * 2, -17], i === 1 ? '#fff' : '#ef4444', null);
      ctx.restore();
    },
    bombpack(ctx, J, o) {
      const p = torsoPt(J, 0.55);
      ctx.save(); ctx.translate(p.x - 6, p.y); ctx.rotate(J.lean);
      U.rrect(ctx, -4, -8, 7, 15, 2); ctx.fillStyle = '#7c5a3a'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.1; ctx.stroke();
      circ(ctx, -1, -9.5, 3, '#26262b', o.ink, 1); circ(ctx, -2.5, 8, 2.6, '#26262b', o.ink, 1);
      ctx.restore();
    },
    medbag(ctx, J, o) {
      const p = torsoPt(J, 0.55);
      ctx.save(); ctx.translate(p.x - 6, p.y); ctx.rotate(J.lean);
      U.rrect(ctx, -5, -7, 9, 13, 2.5); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.fillRect(-1.6, -4.5, 2.2, 7); ctx.fillRect(-4, -2.1, 7, 2.2);
      ctx.restore();
    },
    inkpot(ctx, J, o) {
      const p = torsoPt(J, 0.55);
      ctx.save(); ctx.translate(p.x - 7, p.y); ctx.rotate(J.lean);
      U.rrect(ctx, -5, -6, 10, 13, 3); ctx.fillStyle = '#1e3a8a'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = '#a16207'; ctx.fillRect(-2.5, -10, 5, 4);
      ctx.fillStyle = '#93c5fd'; ctx.fillRect(-3, -2, 2, 6);
      ctx.restore();
    },
    planks(ctx, J, o) {
      const p = torsoPt(J, 0.55);
      ctx.save(); ctx.translate(p.x - 6, p.y); ctx.rotate(J.lean - 0.35);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#c08a4e' : '#d6a15c'; ctx.fillRect(-5 + i * 3, -14 + i, 3.2, 26); ctx.strokeStyle = o.ink; ctx.lineWidth = 0.8; ctx.strokeRect(-5 + i * 3, -14 + i, 3.2, 26); }
      seg(ctx, -6, -2, 5, -2, '#7c2d12', 1.4);
      ctx.restore();
    },
    bigbomb(ctx, J, o) {
      const p = torsoPt(J, 0.65);
      bombShape(ctx, p.x - 9, p.y - 1, 10, o);
    },
  };
  function drawCape(ctx, J, color, t, o) {
    const s = J.s, f = Math.sin(t * 5 + (o.seed || 0)) * 3;
    ctx.beginPath();
    ctx.moveTo(s.x + 2, s.y - 1);
    ctx.quadraticCurveTo(s.x - 10, s.y + 12, s.x - 16 - f, s.y + 30);
    ctx.lineTo(s.x - 4 - f * 0.5, s.y + 28);
    ctx.quadraticCurveTo(s.x - 2, s.y + 12, s.x + 2, s.y - 1);
    ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.3; ctx.stroke();
  }

  // ---------- heads ----------
  const HEAD = {
    cap(c, o) {
      c.beginPath(); c.moveTo(-HR - 0.6, -1.5); c.arc(0, -0.5, HR + 0.8, Math.PI, 0); c.lineTo(HR + 6.5, -1.2); c.lineTo(HR, 0.2); c.closePath();
      c.fillStyle = o.color; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.5; c.stroke();
      circ(c, -1, -HR - 0.6, 1.6, '#fff', o.ink, 1);
    },
    helmet(c, o) {
      c.beginPath(); c.arc(0, -0.5, HR + 1.4, Math.PI, 0); c.closePath();
      c.fillStyle = '#9aa5b4'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.6; c.stroke();
      seg(c, -HR - 2, -0.5, HR + 2, -0.5, o.ink, 2.4);
      seg(c, HR - 2.5, -0.5, HR - 2.5, 4.5, o.ink, 2);
      seg(c, -3, -HR + 1, 2, -HR + 0.6, 'rgba(255,255,255,.7)', 1.4);
    },
    headband(c, o) {
      c.save(); c.beginPath(); c.arc(0, 0, HR, 0, TAU); c.clip();
      c.fillStyle = o.look.band || '#e11d48'; c.fillRect(-HR - 1, -5.2, HR * 2 + 2, 3.6); c.restore();
      const w = Math.sin(o.t * 12) * 2;
      c.strokeStyle = o.look.band || '#e11d48'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(-HR + 1, -3.5); c.quadraticCurveTo(-HR - 5, -4 + w, -HR - 10, -1 - w); c.stroke();
      c.beginPath(); c.moveTo(-HR + 1, -3.5); c.quadraticCurveTo(-HR - 4, 0 - w, -HR - 8, 3 + w); c.stroke();
    },
    ninjaband(c, o) {
      c.save(); c.beginPath(); c.arc(0, 0, HR, 0, TAU); c.clip();
      c.fillStyle = o.look.band || '#b91c1c'; c.fillRect(-HR - 1, -6.6, HR * 2 + 2, 2.6); c.restore();
      const w = Math.sin(o.t * 14) * 2.5;
      c.strokeStyle = o.look.band || '#b91c1c'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-HR + 1, -5.3); c.quadraticCurveTo(-HR - 7, -6 + w, -HR - 15, -3 - w); c.stroke();
      c.beginPath(); c.moveTo(-HR + 1, -5.3); c.quadraticCurveTo(-HR - 6, -2 - w, -HR - 12, 2 + w); c.stroke();
    },
    hood(c, o) {
      const col = o.look.hoodColor || '#2f9e4f';
      c.beginPath(); c.arc(0, 0, HR + 2.2, (115 * Math.PI) / 180, (-48 * Math.PI) / 180, false);
      c.arc(1.6, 0.8, HR - 1.2, (-48 * Math.PI) / 180, (115 * Math.PI) / 180, true); c.closePath();
      c.fillStyle = col; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.4; c.stroke();
      poly(c, [-HR + 1, -HR + 2, -HR - 7, -HR - 1, -HR - 1, -2], col, o.ink, 1.3);
    },
    goggles(c, o) {
      c.save(); c.beginPath(); c.arc(0, 0, HR, 0, TAU); c.clip();
      c.fillStyle = '#3f2a1a'; c.fillRect(-HR - 1, -5.5, HR * 2 + 2, 2.6); c.restore();
      circ(c, HR - 3, -4.2, 3.3, '#7dd3fc', o.ink, 1.4);
      circ(c, HR - 3.8, -5, 1, '#fff');
    },
    medcap(c, o) {
      c.beginPath(); c.moveTo(-HR + 0.5, -3); c.lineTo(-HR + 1, -HR - 3.5); c.lineTo(HR - 1, -HR - 3.5); c.lineTo(HR - 0.5, -3); c.closePath();
      c.fillStyle = '#fff'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.4; c.stroke();
      c.fillStyle = '#ef4444'; c.fillRect(-1.2, -HR - 2.6, 2.4, 6); c.fillRect(-3, -HR - 0.8, 6, 2.4);
    },
    wizhat(c, o) {
      c.beginPath(); c.ellipse(0.5, -HR + 2.5, HR + 6, 2.6, -0.08, 0, TAU);
      c.fillStyle = '#6d28d9'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.4; c.stroke();
      c.beginPath(); c.moveTo(-HR + 0.5, -HR + 2); c.quadraticCurveTo(-4, -HR - 14, -12, -HR - 21); c.quadraticCurveTo(-3, -HR - 13, HR - 0.5, -HR + 2); c.closePath();
      c.fillStyle = '#7c3aed'; c.fill(); c.stroke();
      const sx = -3, sy = -HR - 7;
      poly(c, [sx, sy - 2.8, sx + 0.8, sy - 0.8, sx + 2.8, sy - 0.6, sx + 1.2, sy + 0.8, sx + 1.7, sy + 2.8, sx, sy + 1.6, sx - 1.7, sy + 2.8, sx - 1.2, sy + 0.8, sx - 2.8, sy - 0.6, sx - 0.8, sy - 0.8], '#fde047', null);
    },
    beard(c, o) {
      c.beginPath(); c.moveTo(HR - 1.5, 2); c.quadraticCurveTo(HR + 1, 10, HR - 6, 15); c.quadraticCurveTo(-1, 9, -2.5, 4.5); c.closePath();
      c.fillStyle = '#f5f5f4'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.2; c.stroke();
    },
    plume(c, o) {
      HEAD.helmet(c, o);
      const w = Math.sin(o.t * 6) * 1.5;
      c.beginPath(); c.moveTo(0, -HR - 1); c.quadraticCurveTo(-5, -HR - 10, -15 - w, -HR - 6); c.quadraticCurveTo(-8, -HR - 2, -2, -HR + 1); c.closePath();
      c.fillStyle = '#dc2626'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.2; c.stroke();
    },
    horns(c, o) {
      poly(c, [-4, -6, -9, -10, -12, -19, -6, -11], '#e7e5e4', o.inkBack, 1.2);
      c.beginPath(); c.arc(0, -0.5, HR + 1.3, Math.PI, 0); c.closePath();
      c.fillStyle = '#a8a29e'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.4; c.stroke();
      seg(c, -HR - 2, -0.5, HR + 2, -0.5, '#78716c', 2.2);
      poly(c, [4, -6, 9, -10, 13, -19, 6, -11.5], '#f5f5f4', o.ink, 1.2);
    },
    bandana(c, o) {
      c.beginPath(); c.arc(0, 0.2, HR + 0.6, Math.PI * 1.02, -0.05); c.lineTo(HR, -2); c.lineTo(-HR, -2); c.closePath();
      c.fillStyle = '#dc2626'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.2; c.stroke();
      circ(c, 2, -6, 1, '#fff'); circ(c, -3, -5, 1, '#fff');
      const w = Math.sin(o.t * 10) * 1.5;
      poly(c, [-HR + 0.5, -3, -HR - 6, -6 + w, -HR - 5, 0 - w], '#dc2626', o.ink, 1);
    },
    runband(c, o) {
      c.save(); c.beginPath(); c.arc(0, 0, HR, 0, TAU); c.clip();
      c.fillStyle = '#f59e0b'; c.fillRect(-HR - 1, -5.5, HR * 2 + 2, 3); c.restore();
      if (o.state === 'walk') {
        c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) { const yy = -4 + i * 4; seg(c, -HR - 4, yy, -HR - 12 - i * 2, yy, 'rgba(255,255,255,.7)', 1.2); }
      }
    },
    spikehelm(c, o) {
      for (const sx of [-5, 0, 5]) poly(c, [sx - 2, -HR + 0.5, sx, -HR - 7, sx + 2, -HR + 0.5], '#a8a29e', o.ink, 1);
      c.beginPath(); c.arc(0, -0.5, HR + 1.2, Math.PI, 0); c.closePath();
      c.fillStyle = '#57534e'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.4; c.stroke();
      seg(c, -HR - 1.8, -0.5, HR + 1.8, -0.5, '#292524', 2.2);
    },
    crown(c, o) {
      poly(c, [-6.5, -HR + 2, -7, -HR - 6, -3.5, -HR - 2.5, 0, -HR - 8, 3.5, -HR - 2.5, 7, -HR - 6, 6.5, -HR + 2], '#fbbf24', o.ink, 1.3);
      circ(c, 0, -HR - 1, 1.5, '#ef4444');
    },
    stonehelm(c, o) {
      c.beginPath(); c.arc(0, 0, HR + 1.8, Math.PI * 0.9, Math.PI * 0.1 + TAU, false); c.lineTo(HR + 1, -1); c.lineTo(-HR - 1, -1); c.closePath();
      c.fillStyle = '#78716c'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.5; c.stroke();
      seg(c, -4, -6, 0, -4, '#57534e', 1.2); seg(c, 2, -8, 5, -5, '#57534e', 1.2);
    },
    darkcrown(c, o) {
      poly(c, [-6, -HR + 2, -9, -HR - 9, -3.5, -HR - 2, 0, -HR - 10, 3.5, -HR - 2, 9, -HR - 9, 6, -HR + 2], '#3b0764', o.ink, 1.3);
      circ(c, 0, -HR - 2, 2, '#e879f9');
      c.globalAlpha *= 0.4 + Math.sin(o.t * 4) * 0.2; circ(c, 0, -HR - 2, 4.5, '#f0abfc'); c.globalAlpha = o.alpha;
    },
    skullmask() { /* drawn by face('skull') */ },
    hardhat(c, o) {
      c.beginPath(); c.arc(0, -1, HR + 1.4, Math.PI, 0); c.closePath();
      c.fillStyle = '#facc15'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#facc15'; c.fillRect(-HR - 2, -2, HR * 2 + 7, 2.6); c.strokeRect(-HR - 2, -2, HR * 2 + 7, 2.6);
      seg(c, 0, -HR - 0.6, 0, -2, '#ca8a04', 1.6);
    },
    tophat(c, o) {
      c.save(); c.rotate(-0.12);
      c.fillStyle = '#111827'; c.fillRect(-6.5, -HR - 13, 13, 13); c.fillRect(-10, -HR + 0.5, 20, 2.6);
      c.fillStyle = '#0ea5e9'; c.fillRect(-6.5, -HR - 3.5, 13, 2.6);
      c.restore();
      circ(c, 6.3, -1.4, 2.6, 'rgba(186,230,253,.5)', '#b45309', 1.1);
      c.strokeStyle = '#b45309'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(6.3, 1.2); c.quadraticCurveTo(5, 7, 1, 8); c.stroke();
    },
    beret(c, o) {
      c.beginPath(); c.ellipse(-1, -HR + 1.5, HR + 2.5, 4.2, -0.18, 0, TAU);
      c.fillStyle = '#b91c1c'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1.3; c.stroke();
      seg(c, -1, -HR - 2.6, -0.5, -HR - 5, o.ink, 1.6);
    },
    fullhelm(c, o) {
      seg(c, -1, -HR - 1, -1, -HR - 4, o.ink, 2);
      poly(c, [-3, -HR - 3, 3, -HR - 3, 0, -HR - 9], '#991b1b', o.ink, 1);
    },
  };

  function face(c, o) {
    const look = o.look, f = look.face;
    if (o.dead) {
      c.strokeStyle = o.team === 0 ? o.ink : '#ff5a5a'; c.lineWidth = 1.2;
      for (const ex of [2.8, 6.2]) { seg(c, ex - 1.3, -2.8, ex + 1.3, -0.2, c.strokeStyle, 1.2); seg(c, ex - 1.3, -0.2, ex + 1.3, -2.8, c.strokeStyle, 1.2); }
      return;
    }
    if (f === 'ninja') {
      c.save(); c.beginPath(); c.arc(0, 0, HR, 0, TAU); c.clip();
      c.fillStyle = '#f5f5f4'; c.fillRect(0, -3.6, HR + 1, 4.2); c.restore();
      circ(c, 3.6, -1.5, 1.1, '#111'); circ(c, 6.6, -1.5, 1.1, '#111');
      return;
    }
    if (f === 'visor') {
      c.fillStyle = '#111'; c.fillRect(0.5, -3, HR, 3.2);
      circ(c, 4, -1.4, 1.1, '#ff4040'); circ(c, 7, -1.4, 1.1, '#ff4040');
      return;
    }
    if (f === 'void') {
      c.globalAlpha *= 0.45; circ(c, 4.8, -1.5, 4.2, '#a855f7'); c.globalAlpha = o.alpha;
      poly(c, [1.6, -3.2, 4.8, -1.6, 1.8, -0.4], '#e9d5ff', null);
      poly(c, [5.4, -1.6, 8.2, -3.2, 8, -0.4], '#e9d5ff', null);
      return;
    }
    if (f === 'skull') {
      c.beginPath(); c.arc(1.5, 0.5, HR - 1, -1.3, 1.6); c.closePath();
      c.fillStyle = '#e7e5e4'; c.fill(); c.strokeStyle = o.ink; c.lineWidth = 1; c.stroke();
      circ(c, 3.4, -1.4, 1.5, '#16a34a'); circ(c, 6.6, -1.4, 1.4, '#16a34a');
      seg(c, 4, 4, 7, 4, o.ink, 0.9);
      // feathers
      poly(c, [-4, -HR + 1, -8, -HR - 8, -2, -HR], '#22c55e', o.ink, 0.8);
      poly(c, [-1, -HR, -2, -HR - 10, 2, -HR], '#eab308', o.ink, 0.8);
      return;
    }
    const atk = o.state === 'attack';
    if (o.team === 0) {
      circ(c, 3, -1.4, 1.25, '#111'); circ(c, 6.3, -1.4, 1.25, '#111');
      if (atk) { c.beginPath(); c.ellipse(5, 3.6, 1.6, 1.8, 0, 0, TAU); c.fillStyle = '#111'; c.fill(); }
      else seg(c, 3, 3.6, 6.4, 3.2, '#111', 1.1);
      if (atk || o.def.anim === 'punch') { seg(c, 1.8, -4.2, 4.2, -3.3, '#111', 1); seg(c, 5.2, -3.4, 7.6, -4.2, '#111', 1); }
    } else {
      seg(c, 1.4, -4.6, 4.4, -2.6, '#ff6b6b', 1.1); seg(c, 5.2, -2.6, 8, -4.6, '#ff6b6b', 1.1);
      circ(c, 3.4, -1.2, 1.35, '#ff3b3b'); circ(c, 6.6, -1.2, 1.35, '#ff3b3b');
      c.strokeStyle = '#ff8a8a'; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(2.5, 4); c.lineTo(3.7, 3); c.lineTo(4.9, 4); c.lineTo(6.1, 3); c.lineTo(7.3, 4); c.stroke();
    }
  }

  function drawHead(ctx, J, o) {
    const look = o.look;
    ctx.save(); ctx.translate(J.c.x, J.c.y); ctx.rotate(J.ha);
    circ(ctx, 0, 0, HR, look.headFill || (o.team === 0 ? '#ffffff' : '#2b2533'), o.ink, 2.6);
    face(ctx, o);
    const hs = look.head;
    if (hs) for (let i = 0; i < hs.length; i++) { const fn = HEAD[hs[i]]; if (fn) fn(ctx, o); }
    ctx.restore();
  }

  /**
   * Draw a stickman.
   * o: { x, y, s, dir, pose, look, def, team, t, alpha, flash, state, atkU, dead, color, seed }
   */
  function draw(ctx, o) {
    const p = o.pose, look = o.look || {}, J = solve(p);
    ctx.save();
    ctx.translate(o.x, o.y);
    if (p.rot) ctx.rotate(p.rot * o.dir);
    ctx.scale(o.dir * o.s, o.s);
    if (p.hop) ctx.translate(0, -p.hop);
    ctx.globalAlpha = o.alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    o.ink = o.flash ? FLASH : look.ink || INK;
    o.inkBack = o.flash ? FLASH_BACK : look.ink ? mixHex(look.ink, '#ffffff', 0.3) : INK_BACK;
    const lw = 3.3;

    if (look.aura) {
      ctx.globalAlpha = o.alpha * (0.22 + Math.sin(o.t * 3) * 0.08);
      const g = ctx.createRadialGradient(0, -30, 4, 0, -30, 42);
      const ac = typeof look.aura === 'string' ? look.aura : '#c084fc';
      g.addColorStop(0, ac); g.addColorStop(1, ac + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -30, 42, 0, TAU); ctx.fill();
      ctx.globalAlpha = o.alpha;
    }
    if (look.under) for (const n of look.under) if (LAYER[n]) LAYER[n](ctx, J, o, 'under');
    if (look.cape) drawCape(ctx, J, look.cape, o.t, o);
    if (look.back && BACK[look.back]) BACK[look.back](ctx, J, o);

    limb(ctx, J.s, J.eB, J.hB, o.inkBack, lw);
    if (look.weapon === 'drumsticks') inHand(ctx, J, 1, c => { seg(c, 0, 2, 0, -13, '#854d0e', 1.8); circ(c, 0, -14, 2, '#fde68a', o.inkBack, 0.9); });
    if (look.weapon === 'gloves') { circ(ctx, J.hB.x, J.hB.y, 4.6, '#9f1239', o.inkBack, 1.4); }
    if (look.off && OFF[look.off]) OFF[look.off](ctx, J, o);
    if (look.weapon && WPN_BACK[look.weapon]) WPN_BACK[look.weapon](ctx, J, o);
    limb(ctx, J.hip, J.kB, J.fB, o.inkBack, lw);
    seg(ctx, J.hip.x, J.hip.y, J.neck.x, J.neck.y, o.ink, lw + 0.3);
    limb(ctx, J.hip, J.kF, J.fF, o.ink, lw);
    if (look.front === 'drum') {
      const p = torsoPt(J, 0.22), x = p.x + 9, y = p.y;
      seg(ctx, J.s.x, J.s.y, x - 3, y - 6, '#7f1d1d', 1.4);
      ctx.fillStyle = '#dc2626'; ctx.fillRect(x - 8, y - 6, 16, 12); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.3; ctx.strokeRect(x - 8, y - 6, 16, 12);
      ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= 4; i++) ctx.lineTo(x - 8 + i * 4, i % 2 ? y + 5 : y - 5);
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y - 6, 8, 2.6, 0, 0, TAU); ctx.fillStyle = '#fef3c7'; ctx.fill(); ctx.strokeStyle = o.ink; ctx.lineWidth = 1.2; ctx.stroke();
    }
    if (look.body) for (const n of look.body) if (LAYER[n]) LAYER[n](ctx, J, o, 'body');
    drawHead(ctx, J, o);
    limb(ctx, J.s, J.eF, J.hF, o.ink, lw);
    if (look.weapon && WPN[look.weapon]) WPN[look.weapon](ctx, J, o);
    if (look.over) for (const n of look.over) if (LAYER[n]) LAYER[n](ctx, J, o, 'over');

    if (o.stun) {
      for (let i = 0; i < 3; i++) {
        const a = o.t * 5 + (i * TAU) / 3;
        const sx = J.c.x + Math.cos(a) * 10, sy = J.c.y - HR - 5 + Math.sin(a) * 3;
        poly(ctx, [sx, sy - 2.5, sx + 0.8, sy - 0.8, sx + 2.5, sy, sx + 0.8, sy + 0.8, sx, sy + 2.5, sx - 0.8, sy + 0.8, sx - 2.5, sy, sx - 0.8, sy - 0.8], '#fde047', null);
      }
    }
    ctx.restore();
  }

  // Shared scratch objects to avoid per-frame allocations.
  const _pose = Object.assign({}, BASE);
  const _o = {};

  /** Draw a battle unit (wraps pose + draw). */
  function drawUnit(ctx, u, t) {
    const d = u.def;
    unitPose(u, t, _pose);
    _o.x = u.x; _o.y = u.y; _o.s = u.s; _o.dir = u.dir; _o.pose = _pose; _o.look = d.look; _o.def = d;
    _o.team = u.team; _o.t = t; _o.flash = u.flash > 0; _o.state = u.state;
    _o.atkU = u.state === 'attack' ? u.atkT / u.animDur : -1; _o.dead = !u.alive; _o.color = d.color; _o.seed = u.seed;
    _o.alpha = u.alive ? 1 : U.clamp(1 - (u.deadT - 0.35) / 0.55, 0, 1);
    _o.stun = u.stunT > 0 && u.alive;
    if (_o.alpha <= 0) return;
    draw(ctx, _o);
  }

  /** Draw a unit definition standing (for cards / icons). `anim` loops its attack. */
  function drawPreview(ctx, def, team, x, y, s, t, mode, dirOverride) {
    const pose = Object.assign({}, BASE);
    const fake = { def, state: 'idle', seed: 1, stunT: 0 };
    if (mode === 'anim') {
      const A = ANIMS[def.anim] || ANIMS.slash;
      const cycle = Math.max(1.4, def.animDur + 0.8);
      const k = (t % cycle);
      if (k < def.animDur) { fake.state = 'attack'; fake.atkT = k; fake.animDur = def.animDur; animPose(A, k / def.animDur, pose); }
      else idlePose(def, t, 1, pose);
    } else if (mode === 'walk') {
      fake.state = 'walk'; walkPose(t * 7, def, pose);
    } else {
      idlePose(def, 0, 0, pose);
    }
    draw(ctx, {
      preview: true, x, y, s, dir: dirOverride || (team === 0 ? 1 : -1), pose, look: def.look, def, team, t, alpha: 1, flash: false,
      state: fake.state, atkU: fake.state === 'attack' ? fake.atkT / fake.animDur : -1, dead: false, color: def.color, seed: 1,
    });
  }

  /** Render a unit icon into a canvas element (crisp on HiDPI). */
  function renderIcon(canvas, def, team, opts = {}) {
    const dpr = Math.min(2, window.devicePixelRatio || 1) * (opts.res || 1);
    if (!canvas._cw) { canvas._cw = opts.w || canvas.width; canvas._ch = opts.h || canvas.height; }
    const cw = canvas._cw, ch = canvas._ch;
    if (canvas.width !== Math.round(cw * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const big = def.scale && def.scale > 1.5;
    const s = (ch / 66) * (opts.scale || 1) * (big ? 1.08 : 1);
    if (opts.bg) { ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, cw, ch); }
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath(); ctx.ellipse(cw / 2, ch - 5, 14 * s, 3 * s, 0, 0, TAU); ctx.fill();
    drawPreview(ctx, def, team, cw / 2 - (team === 0 ? 4 : -4) * s, ch - 5, s, opts.t || 0, opts.mode || 'idle');
  }

  /* Registries other modules can extend with new designs. */
  const LAYER = {}, WPN_BACK = {};
  const H = { circ, seg, poly, limb, inHand, torsoPt, mixHex, bombShape };
  return { draw, drawUnit, drawPreview, renderIcon, unitPose, ANIMS, KB_DUR, HR, WPN, WPN_BACK, HEAD, BACK, OFF, LAYER, H, P, S, STANCE };
})();
