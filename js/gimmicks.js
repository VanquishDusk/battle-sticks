'use strict';
/* =========================================================
   Campaign 2 mechanics.
   Enemy traits run as ability modules (TraitFX, picked by
   fxList from the unit's definition); stage rules and the
   targeting / damage checks are Battle methods.
   ========================================================= */

/* ---------- who can hit what ---------- */
const MAGIC_ATTACKS = { magic: 1, hex: 1, chrono: 1, judge: 1, tide: 1, astral: 1, erase: 1 };
/** Can this unit hit flyers? Ranged units (range 120+) and a few long reaches. */
function isAntiAir(def) {
  if (def._aa == null) def._aa = ANTI_AIR[def.id] != null ? ANTI_AIR[def.id] : def.range >= 120 && def.attack !== 'heal' && def.attack !== 'none';
  return def._aa;
}
/** Do this unit's hits count as magic (they hit faded Ethereal foes)? */
function isMagic(def) {
  if (def._mg == null) def._mg = !!(MAGIC_UNITS[def.id] || MAGIC_ATTACKS[def.attack] || def.magic);
  return def._mg;
}
const lightOf = def => LIGHT[def.id] || 0;
/** Small icon tags for unit cards: what this unit counters. */
function unitTagsHtml(def) {
  let h = '';
  if (isAntiAir(def)) h += '<span class="ut" style="--uc:#0284c7" title="Anti-air: can hit flying enemies">&#9992;</span>';
  if (isMagic(def)) h += '<span class="ut" style="--uc:#7c3aed" title="Magic: hits faded Ethereal enemies">&#10022;</span>';
  if (lightOf(def)) h += '<span class="ut" style="--uc:#ca8a04" title="Light-bearer: sees farther in the dark">&#9728;</span>';
  return h;
}

/* ---------- enemy traits ---------- */
TraitFX.fly = {
  spawn(b, u) { u.trait = true; u.fly = u.def.fly; u.y -= u.fly; },
};
TraitFX.plate = {
  spawn(b, u) { u.trait = true; u.plate = u.def.plate * (u.team === 1 ? 1 + (u.mult - 1) * (u.def.boss ? 0.45 : 0.7) : u.mult); },
};
TraitFX.guard = {
  spawn(b, u) { u.trait = true; },
};
TraitFX.phase = {
  spawn(b, u) { u.trait = true; u.phased = false; u.phaseT = U.rand(0.6, u.def.phase.off); },
  update(b, u, dt) {
    const ph = u.def.phase;
    u.phaseT -= dt;
    if (u.phaseT > 0) return;
    u.phased = !u.phased;
    u.phaseT = u.phased ? ph.on : ph.off;
    for (let i = 0; i < 8; i++) b.part({ type: 'smoke', x: u.x + U.rand(-10, 10), y: u.y - U.rand(10, 60) * u.s, vx: U.rand(-30, 30), vy: U.rand(-40, 0), life: 0.6, size: U.rand(4, 8) * u.s, color: u.phased ? '#cbd5e1' : '#64748b' });
  },
};
TraitFX.burrow = {
  spawn(b, u) { if (u.team !== 1) return; u.trait = true; u.burrowed = true; u.anchored = true; u.anchorWalk = false; },
  update(b, u, dt) {
    if (!u.burrowed) return;
    u.x += u.dir * u.def.dig * b.moveMult(u) * dt;
    b.clampUnit(u);
    if (Math.random() < dt * 14) b.part({ type: 'debris', x: u.x + U.rand(-8, 8), y: u.y - 2, vx: -u.dir * U.rand(10, 70), vy: U.rand(-140, -50), g: 800, life: 0.5, size: U.rand(2, 4), color: b.theme.pathDark, rot: 0, vr: 6 });
    // pop up behind the rearmost stickman, or in front of the tower
    let rear = Infinity;
    for (const o of b.team[0]) if (o.alive && !o.def.structure && !o.fly) rear = Math.min(rear, o.x);
    const stop = Math.max(b.pBase.front + 170, rear === Infinity ? -1e9 : rear - 60);
    if (u.x <= stop) b.surface(u);
  },
  act(b, u, tgt) { return u.burrowed ? null : tgt; },
};
TraitFX.split = {
  death(b, u) {
    if (b.state !== 'play' || u.erased || u.team !== 1) return;
    const sp = u.def.split;
    for (let k = 0; k < sp.n; k++) {
      const c = b.spawnEnemy(sp.into, u.mult, { x: u.x + (k - (sp.n - 1) / 2) * 24 + U.rand(-5, 5), lane: U.clamp(u.lane + U.rand(-0.3, 0.3), 0, 1) });
      if (c) { c.atkCd = 0.7; b.knockback(c, 0.35); }
    }
    for (let i = 0; i < 14; i++) b.part({ type: 'smoke', x: u.x + U.rand(-12, 12), y: u.y - U.rand(10, 50) * u.s, vx: U.rand(-90, 90), vy: U.rand(-90, 20), life: 0.7, size: U.rand(4, 9) * u.s, color: i % 2 ? '#1e1b4b' : '#4c1d95' });
    b.text(u.x, u.y - 70 * u.s, 'SPLIT!', '#c4b5fd', 16, 0.7);
    b.sfx('paint', 0.1);
  },
};

/* ---------- bosses and structures ---------- */
UnitFX.generator = {
  death(b, u) {
    const left = (b.gens || []).filter(g => g.alive).length;
    b.emit('banner', left ? { text: 'GENERATOR DOWN!', cls: 'gold', small: `${left} left` } : { text: 'SHIELD DOWN!', cls: 'gold', small: 'The fortress is exposed!' });
    if (!left) { b.eBase.shielded = false; b.flash = 0.35; b.flashCol = '#fde68a'; }
    b.explosion(u.x, u.y - 50, 70, false);
    b.sfx('thunder', 0.2);
  },
};

// Storm Roc: never lands; its Gale Dive blasts your army backwards.
UnitFX.roc = {
  spawn(b, u) { u.gustT = 7; },
  update(b, u, dt) {
    u.gustT -= dt;
    if (u.gustT < 1.1 && !u.gustWarn) {
      u.gustWarn = true;
      b.text(u.x, u.y - 120 * u.s, 'GALE DIVE!', '#7dd3fc', 22, 1.1);
      b.sfx('roar', 0.3);
    }
    if (u.gustT > 0) return;
    u.gustT = 10; u.gustWarn = false;
    const dmg = b.dmgOf(u) * 0.45;
    for (const o of b.team[0]) {
      if (!o.alive || o.def.structure) continue;
      const d = (u.x - o.x);
      if (d < -60 || d > 440) continue;
      b.damage(o, dmg, { team: 1, unit: u, kbForce: true });
    }
    for (let i = 0; i < 40; i++) b.part({ type: 'smoke', x: u.x - U.rand(0, 420), y: GROUND_Y - U.rand(0, 140), vx: -U.rand(250, 520), vy: U.rand(-30, 30), life: 0.6, size: U.rand(3, 7), color: '#e0f2fe' });
    b.addShake(9); b.sfx('tide', 0.2);
  },
};

// Iron Tyrant: lobs cannon shells at the thickest part of your army.
UnitFX.tyrant = {
  spawn(b, u) { u.canT = 5; },
  update(b, u, dt) {
    u.canT -= dt;
    if (u.canT > 0) return;
    let best = null, bn = 0;
    for (const o of b.team[0]) {
      if (!o.alive || o.def.structure || o.x > u.x || u.x - o.x > 760) continue;
      let n = 0;
      for (const p of b.team[0]) if (p.alive && Math.abs(p.x - o.x) < 90) n++;
      if (n > bn) { bn = n; best = o; }
    }
    if (!best) { u.canT = 1; return; }
    u.canT = 9;
    const tx = best.x, dmg = b.dmgOf(u) * 1.5, T = 1.5, x0 = u.x, y0 = u.y - 90 * u.s;
    b.text(u.x, u.y - 130 * u.s, 'FIRE!', '#f87171', 20, 0.9);
    b.sfx('heavy', 0.2);
    b.addCustom({ x: tx, T,
      step(bb, p) {
        if (p.t < p.T) return;
        p.done = true;
        for (const o of bb.team[0]) if (o.alive && !o.fly && Math.abs(o.x - tx) <= 95) bb.damage(o, dmg, { team: 1, unit: u, kbForce: true });
        bb.explosion(tx, GROUND_Y + 4, 95, false);
        bb.shockwave(tx, GROUND_Y + 12, 1.6);
      },
      drawFn(ctx, p, t) {
        const k = p.t / p.T;
        ctx.save();
        ctx.globalAlpha = 0.45 + 0.4 * Math.abs(Math.sin(t * 12));
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(tx, GROUND_Y + 12, 95, 16, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx - 20, GROUND_Y + 12); ctx.lineTo(tx + 20, GROUND_Y + 12); ctx.moveTo(tx, GROUND_Y + 2); ctx.lineTo(tx, GROUND_Y + 22); ctx.stroke();
        ctx.globalAlpha = 1;
        // the shell's arc
        const sx = U.lerp(x0, tx, k), sy = U.lerp(y0, GROUND_Y + 4, k) - Math.sin(k * Math.PI) * 260;
        ctx.fillStyle = '#1f2937'; ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, 11, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(sx - 3, sy - 3, 3, 0, TAU); ctx.fill();
        ctx.restore();
      },
    });
  },
};

// The Blot: sheds Void Blots as it weakens, hiding in an ink cocoon each time.
UnitFX.bigblot = {
  spawn(b, u) { u.trait = true; u.splitIdx = 0; u.cocoonT = 0; },
  update(b, u, dt) { if (u.cocoonT > 0) u.cocoonT -= dt; },
  hurt(b, u) {
    const th = [0.75, 0.5, 0.25];
    while (u.splitIdx < th.length && u.hp / u.maxHp < th[u.splitIdx]) {
      u.splitIdx++;
      u.cocoonT = 1.8;
      for (let k = 0; k < 3; k++) {
        const c = b.spawnEnemy('blot', u.mult, { x: u.x - 30 + k * 30, lane: k / 2 });
        if (c) b.knockback(c, 0.5);
      }
      for (const o of b.team[0]) if (o.alive && !o.def.structure && Math.abs(o.x - u.x) < 170) b.knockback(o, 1.2);
      b.emit('banner', { text: 'THE BLOT DIVIDES!', cls: 'red' });
      b.addShake(10); b.sfx('boss', 0.3);
    }
  },
  draw(b, ctx, u, t, layer) {
    if (layer !== 'over' || !(u.cocoonT > 0)) return;
    const a = Math.min(1, u.cocoonT / 0.4), cy = u.y - 50 * u.s;
    ctx.save(); ctx.globalAlpha = 0.75 * a;
    const g = ctx.createRadialGradient(u.x, cy, 10, u.x, cy, 70 * u.s);
    g.addColorStop(0, '#4c1d95'); g.addColorStop(0.7, '#1e1b4b'); g.addColorStop(1, 'rgba(10,5,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(u.x, cy, 50 * u.s, 62 * u.s, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = a; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = t * 30;
    ctx.beginPath(); ctx.ellipse(u.x, cy, 48 * u.s, 60 * u.s, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  },
};

/* ---------- Battle: targeting, damage checks, rules ---------- */
Object.assign(Battle.prototype, {
  /** Can unit u attack unit o at all (flyers, faded ghosts, tunnelers, darkness)? */
  canTarget(u, o) {
    if (u.def.raid) return false; // raiders only go for the tower
    if (!o.trait && !this.dark) return true;
    if (o.burrowed) return false;
    if (o.fly && !isAntiAir(u.def)) return false;
    if (this.dark && u.team === 0 && !this.isLit(o)) return false;
    return true;
  },
  /** True when a trait makes the target ignore this hit completely. */
  traitBlock(t, src) {
    if (t.cocoonT > 0 && !src.thunder) { this.note(t, 'IMMUNE', '#c4b5fd'); return true; }
    if (t.burrowed) { if (src.thunder) { this.surface(t); return false; } return true; }
    if (t.phased && !(src.thunder || src.evo || src.magic || (src.unit && isMagic(src.unit.def)))) { this.note(t, 'IMMUNE', '#e2e8f0'); return true; }
    return false;
  },
  /** Shields and plating that shrink a hit. */
  traitReduce(t, amt, src, crit) {
    const d = t.def;
    if (d.guard && src.unit && !src.evo && !src.thunder && src.unit.def.range >= 120 && t.state !== 'kb') {
      amt *= 1 - d.guard;
      if (this.note(t, 'BLOCKED', '#fde68a')) { this.spark(t.x + t.dir * 12 * t.s, t.y - 30 * t.s, '#fde68a', 6); this.sfx('clang', 0.1); }
    }
    if (t.plate && !crit && !src.thunder) {
      const cut = Math.min(t.plate, amt * 0.9);
      if (cut > amt * 0.6 && this.note(t, 'PLATED', '#cbd5e1')) this.sfx('clang', 0.1);
      amt -= cut;
    }
    return amt;
  },
  /** A throttled floating label over a unit; true if it was shown. */
  note(t, s, col) {
    if (this.t - (t.noteT || -9) < 0.7) return false;
    t.noteT = this.t;
    this.text(t.x, t.y - 74 * t.s, s, col, 14, 0.6);
    return true;
  },
  /** A Tunneler pops out of the ground. */
  surface(u) {
    if (!u.burrowed) return;
    u.burrowed = false; u.anchored = false; u.state = 'idle'; u.atkCd = 0.4;
    for (let i = 0; i < 16; i++) this.part({ type: 'debris', x: u.x + U.rand(-16, 16), y: u.y - 4, vx: U.rand(-160, 160), vy: U.rand(-320, -120), g: 900, life: 0.7, size: U.rand(3, 6), color: this.theme.pathDark, rot: 0, vr: U.rand(-10, 10) });
    this.dust(u.x, u.y, 10);
    const dmg = this.dmgOf(u) * 0.8;
    for (const o of this.team[1 - u.team]) if (o.alive && !o.def.structure && Math.abs(o.x - u.x) < 55) this.damage(o, dmg, { team: u.team, unit: u, stun: 0.5 });
    this.text(u.x, u.y - 70 * u.s, 'AMBUSH!', '#fb923c', 18, 0.9);
    this.sfx('heavy', 0.15);
  },
  isLit(o) {
    if (this.darkLift > 0) return true;
    const L = this.lights;
    for (let i = 0; i < L.length; i++) if (Math.abs(o.x - L[i][0]) <= L[i][1]) return true;
    return false;
  },
  /** Stickmen the player summoned (helpers like doodles or clones don't count). */
  armySize() {
    let n = 0;
    for (const u of this.units) if (u.alive && u.summoned && u.team === 0) n++;
    return n;
  },
  windMult(u) {
    const w = this.wind;
    if (!w || w.state === 'calm') return 1;
    const good = (u.team === 0) === (w.state === 'tail');
    const f = u.fly ? (good ? 1.6 : 0.4) : good ? 1.35 : 0.55;
    return 1 + (f - 1) * w.k;
  },

  initRules() {
    const R = this.rules;
    if (R.generators) {
      this.gens = R.generators.map((f, i) => this.spawnUnit(ENEMIES.generator, 1, this.L.mult, { x: Math.round(this.W * f), lane: i % 2 ? 0.25 : 0.7 }));
      this.eBase.shielded = true;
    }
    if (R.wind) this.wind = { state: 'calm', t: 12, next: 'tail', k: 0, gusts: [] };
    if (R.dark) { this.dark = R.dark; this.darkLift = 0; this.lights = []; }
  },
  updateRules(dt) {
    const w = this.wind;
    if (w && this.state === 'play') {
      w.t -= dt;
      const R = this.rules.wind;
      if (w.t <= 0) {
        if (w.state === 'calm') {
          w.state = w.next; w.next = w.state === 'tail' ? 'head' : 'tail'; w.t = R.dur;
          this.emit('banner', w.state === 'tail' ? { text: 'TAILWIND!', cls: 'gold', small: 'Your army charges ahead' } : { text: 'HEADWIND!', cls: 'red', small: 'The enemy rides the gale' });
          this.sfx('tide', 0.3);
        } else { w.state = 'calm'; w.t = R.every - R.dur; }
      }
      w.k = w.state === 'calm' ? Math.max(0, w.k - dt * 2) : Math.min(1, w.k + dt * 2);
    }
    if (this.dark) {
      if (this.darkLift > 0) this.darkLift -= dt;
      const L = this.lights; L.length = 0;
      const base = this.dark.light;
      L.push([this.pBase.front, 260, BASE_GY - 160]);
      for (const u of this.team[0]) if (u.alive) L.push([u.x, base + lightOf(u.def), u.y - 40 * u.s]);
    }
  },
  /** Status of the stage rules for the HUD. */
  ruleStatus() {
    const out = [];
    const R = this.rules;
    if (this.wind) out.push({ id: 'wind', state: this.wind.state, next: this.wind.next, t: Math.ceil(this.wind.t) });
    if (this.gens) out.push({ id: 'generators', left: this.gens.filter(g => g.alive).length, total: this.gens.length });
    if (R.unitCap) out.push({ id: 'unitCap', n: this.armySize(), cap: R.unitCap });
    if (R.costCap) out.push({ id: 'costCap', cap: R.costCap });
    if (this.dark) out.push({ id: 'dark', lift: this.darkLift > 0 });
    return out;
  },

  // ---------- drawing ----------
  /** Generator beams and the fortress shield, drawn behind the units. */
  drawRulesUnder(ctx, t) {
    if (!this.gens) return;
    const fx = this.eBase.x, fy = BASE_GY - 210;
    for (const g of this.gens) {
      if (!g.alive) continue;
      const gx = g.x, gy = g.y - 112 * g.s;
      ctx.save(); ctx.globalAlpha = 0.55 + 0.35 * Math.abs(Math.sin(t * 9 + g.id));
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(gx, gy);
      for (let i = 1; i < 10; i++) { const k = i / 10; ctx.lineTo(U.lerp(gx, fx, k) + U.rand(-5, 5), U.lerp(gy, fy, k) - Math.sin(k * Math.PI) * 60 + U.rand(-8, 8)); }
      ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    if (this.eBase.shielded && !this.eBase.destroyed) {
      const cx = this.eBase.x, cy = BASE_GY - 150;
      ctx.save();
      ctx.globalAlpha = 0.16 + 0.05 * Math.sin(t * 3); ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.ellipse(cx, cy, 175, 215, 0, Math.PI, TAU); ctx.lineTo(cx + 175, BASE_GY); ctx.lineTo(cx - 175, BASE_GY); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 3; ctx.stroke();
      ctx.globalAlpha = 0.25; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { const a = Math.PI + (i + 0.5) * Math.PI / 6 + Math.sin(t) * 0.04; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 175, cy + Math.sin(a) * 215); ctx.stroke(); }
      ctx.restore();
    }
  },
  /** Wind streaks, darkness and glowing eyes in the dark, drawn over the battlefield. */
  drawRulesOver(ctx, t, cam, dt) {
    const w = this.wind;
    if (w && w.k > 0) {
      const dir = w.state === 'tail' || (w.state === 'calm' && w.next === 'head') ? 1 : -1;
      if (!this.streaks) this.streaks = Array.from({ length: 34 }, () => ({ x: Math.random() * VIEW_W, y: 80 + Math.random() * 480, v: U.rand(700, 1200), l: U.rand(40, 120) }));
      ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (const s of this.streaks) {
        s.x += dir * s.v * dt;
        if (s.x > VIEW_W + 140) s.x = -140; if (s.x < -140) s.x = VIEW_W + 140;
        ctx.globalAlpha = 0.35 * w.k;
        const x = cam + s.x, y = s.y + Math.sin(t * 3 + s.v) * 6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - dir * s.l * 0.5, y - 4, x - dir * s.l, y + 2); ctx.stroke();
      }
      ctx.restore();
    }
    if (!this.dark) return;
    const k = 0.5, W = VIEW_W * k, H = VIEW_H * k;
    if (!this.darkC) { this.darkC = document.createElement('canvas'); this.darkC.width = W; this.darkC.height = H; }
    const o = this.darkC.getContext('2d');
    const lift = U.clamp(this.darkLift / 0.8, 0, 1);
    o.globalCompositeOperation = 'source-over';
    o.clearRect(0, 0, W, H);
    o.fillStyle = `rgba(6,3,20,${0.88 * (1 - lift)})`; o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = 'destination-out';
    for (const [x, r, y] of this.lights) {
      const sx = (x - cam) * k, sy = y * k, rr = r * k * 1.05;
      if (sx < -rr || sx > W + rr) continue;
      const g = o.createRadialGradient(sx, sy, rr * 0.3, sx, sy, rr);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = g; o.beginPath(); o.arc(sx, sy, rr, 0, TAU); o.fill();
    }
    ctx.drawImage(this.darkC, cam, 0, VIEW_W, VIEW_H);
    if (lift >= 1) return;
    // glowing eyes of the enemies hiding in the dark
    for (const u of this.team[1]) {
      if (!u.alive || u.burrowed || u.def.structure || this.isLit(u) || u.x < cam - 40 || u.x > cam + VIEW_W + 40) continue;
      const ex = u.x + u.dir * 5 * u.s, ey = u.y - 52 * u.s + (u.fly ? Math.sin(t * 3 + u.seed) * 5 : 0);
      ctx.globalAlpha = (0.55 + 0.35 * Math.sin(t * 2 + u.seed)) * (1 - lift) * (u.phased ? 0.4 : 1);
      ctx.fillStyle = u.def.boss ? '#f0abfc' : '#ff4d4d';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(ex + s * 3 * u.s, ey, 2 * u.s, 1.3 * u.s, 0, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  },
  drawMound(ctx, u, t) {
    if (!u.alive) return;
    const x = u.x, y = u.y + 2, wob = Math.sin(t * 20 + u.seed) * 1.5;
    ctx.save();
    ctx.fillStyle = this.theme.pathDark; ctx.strokeStyle = 'rgba(43,33,24,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.quadraticCurveTo(x - 10, y - 16 - wob, x + 2, y - 14); ctx.quadraticCurveTo(x + 16, y - 12 + wob, x + 24, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - 12 + i * 8, y - 6 - (i % 2) * 4, 2, 0, TAU); ctx.fill(); }
    // the drill tip poking out
    ctx.fillStyle = '#9ca3af'; ctx.strokeStyle = '#374151';
    ctx.beginPath(); ctx.moveTo(x + u.dir * 12, y - 8); ctx.lineTo(x + u.dir * 26, y - 12 + wob); ctx.lineTo(x + u.dir * 12, y - 15); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  drawGenerator(ctx, u, t) {
    const a = u.alive ? 1 : Math.max(0, 1 - u.deadT / 0.5);
    if (a <= 0) return;
    const s = u.s, frac = u.hp / u.maxHp;
    ctx.save(); ctx.translate(u.x, u.y); ctx.scale(s, s); ctx.globalAlpha = a;
    const ink = u.flash > 0 ? '#ff3030' : '#1f2937';
    ctx.lineJoin = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = 2.2;
    // base
    ctx.fillStyle = '#4b5563'; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-20, -18); ctx.lineTo(20, -18); ctx.lineTo(26, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#facc15'; for (let i = 0; i < 4; i++) ctx.fillRect(-18 + i * 10, -12, 5, 6);
    // coil column
    ctx.fillStyle = '#6b7280'; ctx.fillRect(-7, -82, 14, 64); ctx.strokeRect(-7, -82, 14, 64);
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const y = -26 - i * 9; ctx.beginPath(); ctx.ellipse(0, y, 12, 3.5, 0, 0, Math.PI); ctx.stroke(); }
    ctx.strokeStyle = ink; ctx.lineWidth = 2.2;
    // orb
    const pulse = 0.75 + 0.25 * Math.sin(t * 6 + u.id);
    if (u.alive) ZArt.glow(ctx, 0, -94, 30 * pulse, '#fde047', 0.7);
    ctx.fillStyle = u.alive ? '#fef08a' : '#57534e'; ctx.beginPath(); ctx.arc(0, -94, 11, 0, TAU); ctx.fill(); ctx.stroke();
    if (u.alive) for (let i = 0; i < 3; i++) {
      const a0 = t * 5 + i * 2.1;
      ctx.strokeStyle = '#fef9c3'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(Math.cos(a0) * 11, -94 + Math.sin(a0) * 11); ctx.lineTo(Math.cos(a0) * 20, -94 + Math.sin(a0) * 20 + U.rand(-3, 3)); ctx.stroke();
    }
    if (frac < 0.6) { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -70); ctx.lineTo(1, -58); ctx.lineTo(-3, -48); ctx.stroke(); }
    if (frac < 0.3 && Math.random() < 0.2) this.part({ type: 'spark', x: u.x + U.rand(-10, 10), y: u.y - U.rand(40, 100) * s, vx: U.rand(-80, 80), vy: U.rand(-120, 0), life: 0.3, size: 2.5, color: '#fde047' });
    ctx.restore();
  },
});
