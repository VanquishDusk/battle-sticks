'use strict';
/* =========================================================
   Ability modules for special Stickfigures (the 12 Zodiacs
   and Purity traits). Each entry in UnitFX can implement:
     spawn(b,u)            when the unit enters the field
     update(b,u,dt)        every frame while able to act
     act(b,u,tgt)          what to attack (null = don't)
     attackStart(b,u)      an attack animation begins
     attack(b,u,src,dmg)   replaces the default attack (return true)
     hit(b,u,target,amt)   after this unit damages something
     hurt(b,u,amt,src)     after this unit takes damage
     kill(b,u,victim)      this unit landed a killing blow
     death(b,u)            this unit died
     draw(b,ctx,u,t,layer) world-space effects ('under' | 'over')
   ========================================================= */

(() => {
  const near = (b, u, team, r, fn) => { for (const o of b.team[team]) if (o.alive && !o.def.structure && Math.abs(o.x - u.x) <= r) fn(o); };
  const enemiesNear = (b, u, r) => b.team[1 - u.team].some(o => o.alive && Math.abs(o.x - u.x) <= r);
  const burst = (b, x, y, n, col, spd) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = U.rand(40, spd || 160); b.part({ type: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: U.rand(0.4, 0.8), size: U.rand(2.5, 4.5), color: col }); } };

  // ♈ Aries: every 3rd attack is a knockback charge.
  UnitFX.aries = {
    update(b, u, dt) {
      if (u.state === 'walk' && Math.random() < dt * 16) {
        b.part({ type: 'spark', x: u.x + u.dir * U.rand(4, 12) * u.s, y: u.y - U.rand(16, 30) * u.s, vx: -u.dir * U.rand(20, 90), vy: U.rand(-60, 0), life: 0.3, size: 2.2, color: Math.random() < 0.5 ? '#fb923c' : '#fde047' });
      }
    },
    attack(b, u, src, dmg) {
      const c = u.def.charge;
      u.hits++;
      if (u.hits % c.every) return false;
      const x0 = u.x, foe = b.findTarget(u, c.reach + 20);
      const dash = foe && !foe.isBase ? U.clamp((foe.x - u.x) * u.dir - 12, 0, c.dash) : c.dash * 0.4;
      u.x += u.dir * dash; b.clampUnit(u);
      for (let i = 0; i < 14; i++) b.part({ type: 'fire', x: U.lerp(x0, u.x, i / 14), y: u.y - U.rand(14, 40) * u.s, vx: -u.dir * U.rand(40, 120), vy: U.rand(-40, 20), life: 0.45, size: U.rand(4, 8), color: i % 2 ? '#f97316' : '#fde047' });
      for (const t of b.targetsInRange(u, c.reach)) b.damage(t, dmg * c.mult, Object.assign({}, src, { kbForce: !t.isBase && !t.def.boss }));
      b.part({ type: 'flash', x: u.x + u.dir * 26, y: u.y - 30 * u.s, life: 0.25, size: 48, color: '#fb923c' });
      b.ring(u.x + u.dir * 30, u.y - 26, '#f97316', 64);
      b.text(u.x, u.y - 88 * u.s, 'METEOR CHARGE!', '#fb923c', 16, 0.9);
      b.addShake(6); b.sfx('heavy', 0.1);
      return true;
    },
  };

  // ♉ Taurus: periodic star shields for nearby allies.
  UnitFX.taurus = {
    spawn(b, u) { u.fxT = 1.5; },
    update(b, u, dt) {
      const p = u.def.shieldPulse;
      u.fxT -= dt;
      if (u.fxT > 0 || !enemiesNear(b, u, 450)) return;
      u.fxT = p.every;
      const amt = p.amt * u.mult + p.pct * u.maxHp;
      near(b, u, u.team, p.r, o => { o.shieldHp = Math.max(o.shieldHp, amt); o.shieldT = p.dur; });
      b.part({ type: 'ring', x: u.x, y: u.y - 4, life: 0.7, size: p.r, color: '#4ade80', flat: true });
      b.ring(u.x, u.y - 40, '#86efac', 70);
      burst(b, u.x, u.y - 50 * u.s, 12, '#bbf7d0');
      b.text(u.x, u.y - 96 * u.s, 'STAR SHIELD', '#86efac', 15, 0.9);
      b.sfx('shield', 0.3);
    },
  };

  // ♊ Gemini: a spectral twin that mirrors attacks; hits on one hasten the other.
  function summonTwin(b, u) {
    const tw = b.spawnUnit(ZODIAC_SPAWNED.gemTwin, u.team, u.mult, { x: u.x - u.dir * 22, owner: u, lane: U.clamp(u.lane + (u.lane > 0.5 ? -0.4 : 0.4), 0, 1) });
    tw.maxHp = tw.hp = u.def.hp * u.def.twin.hp * u.mult;
    tw.dmg = u.dmg * u.def.twin.dmg;
    tw.anchored = true; tw.atkCd = 99;
    u.twin = tw; u.fxT = 0;
    burst(b, tw.x, tw.y - 30, 12, '#93c5fd');
    b.sfx('magic', 0.2);
  }
  UnitFX.gemini = {
    spawn(b, u) { summonTwin(b, u); },
    update(b, u, dt) {
      if (u.twin && u.twin.alive) return;
      u.fxT += dt;
      if (u.fxT >= u.def.twin.respawn) { summonTwin(b, u); b.text(u.x, u.y - 86 * u.s, 'TWIN REFORMED', '#93c5fd', 14, 0.9); }
    },
    attackStart(b, u) { const tw = u.twin; if (tw && tw.alive && tw.stunT <= 0 && tw.state !== 'kb') tw.atkCd = 0; },
    hurt(b, u) { if (u.twin && u.twin.alive) u.twin.hasteT = 2; },
    death(b, u) { if (u.twin && u.twin.alive) u.twin.lifeLeft = 0.6; },
    draw(b, ctx, u, t, layer) {
      const tw = u.twin;
      if (layer !== 'under' || !tw || !tw.alive) return;
      const x1 = u.x, y1 = u.y - 40 * u.s, x2 = tw.x, y2 = tw.y - 40 * tw.s;
      for (let i = 0; i <= 8; i++) {
        const k = i / 8, x = U.lerp(x1, x2, k), y = U.lerp(y1, y2, k) + Math.sin(k * Math.PI) * 8 + Math.sin(t * 5 + i) * 1.5;
        ctx.globalAlpha = 0.85;
        ZArt.star4(ctx, x, y, 2.6 + Math.sin(t * 6 + i) * 0.8, k < 0.5 ? '#fde047' : '#93c5fd');
      }
      ctx.globalAlpha = 1;
    },
  };
  UnitFX.gemTwin = {
    update(b, u, dt) {
      const g = u.owner;
      if (!g || !g.alive) { u.anchorWalk = false; return; }
      u.x += (g.x - g.dir * 22 - u.x) * Math.min(1, dt * 8);
      u.anchorWalk = g.state === 'walk';
      if (u.anchorWalk) u.phase = g.phase + Math.PI;
    },
    attack(b, u) { const t = b.findTarget(u, u.def.range + 20); if (t) b.launch(u, t, 'star'); b.sfx('throw', 0.05); return true; },
    hurt(b, u) { if (u.owner && u.owner.alive) u.owner.hasteT = 2; },
  };

  // ♋ Cancer: moon barriers that block 40% of incoming damage.
  UnitFX.cancer = {
    spawn(b, u) { u.fxT = 1; },
    update(b, u, dt) {
      const p = u.def.barrier;
      u.fxT -= dt;
      if (u.fxT > 0 || !enemiesNear(b, u, 450)) return;
      u.fxT = p.every;
      near(b, u, u.team, p.r, o => { o.barrierT = Math.max(o.barrierT, p.dur); });
      b.part({ type: 'ring', x: u.x, y: u.y - 4, life: 0.7, size: p.r, color: '#93c5fd', flat: true });
      burst(b, u.x, u.y - 50 * u.s, 10, '#e0f2fe');
      b.text(u.x, u.y - 92 * u.s, 'MOONLIT SHELTER', '#bfdbfe', 15, 0.9);
      b.sfx('moon', 0.3);
    },
  };

  // ♌ Leo: damage aura; roars on kills for attack speed.
  UnitFX.leo = {
    update(b, u, dt) {
      u.fxT -= dt;
      if (u.fxT > 0) return;
      u.fxT = 0.3;
      near(b, u, u.team, u.def.radiance.r, o => { o.radT = Math.max(o.radT, 0.6); });
    },
    kill(b, u, victim) {
      if (victim.team === u.team) return;
      near(b, u, u.team, u.def.roar.r, o => { o.roarT = Math.max(o.roarT, u.def.roar.dur); });
      b.text(u.x, u.y - 92 * u.s, 'ROAR!', '#fbbf24', 24, 1);
      b.part({ type: 'flash', x: u.x, y: u.y - 50 * u.s, life: 0.35, size: 60, color: '#fde047' });
      b.part({ type: 'ring', x: u.x, y: u.y - 4, life: 0.6, size: u.def.roar.r, color: '#fbbf24', flat: true });
      b.addShake(3); b.sfx('roar', 0.4);
    },
  };

  // ♍ Virgo: heals everyone nearby, more for the badly hurt.
  UnitFX.virgo = {
    act(b, u) { return b.injuredNear(u) ? true : null; },
    attack(b, u) {
      const d = u.def;
      let healed = 0;
      for (const o of b.team[u.team]) {
        if (!o.alive || o.def.structure || Math.abs(o.x - u.x) > d.healR || o.hp >= o.maxHp) continue;
        const miss = 1 - o.hp / o.maxHp, amt = u.heal * (1 + 2 * miss);
        o.hp = Math.min(o.maxHp, o.hp + amt); healed++;
        for (let i = 0; i < 3; i++) b.part({ type: i ? 'plus' : 'star', x: o.x + U.rand(-10, 10), y: o.y - U.rand(20, 55) * o.s, vx: 0, vy: -40, life: 0.9, size: 4.5, color: i ? '#86efac' : '#ffffff' });
        if (miss > 0.45) b.text(o.x, o.y - 72 * o.s, '+' + Math.round(amt), '#86efac', 14, 0.8);
      }
      b.ring(u.x, u.y - 30, '#86efac', d.healR * 0.8);
      burst(b, u.x, u.y - 55 * u.s, 10, '#f0fdf4', 120);
      if (healed) b.sfx('heal', 0.15);
      return true;
    },
  };

  // ♎ Libra: marks the strongest enemy in range, weakening it.
  const strength = o => o.maxHp * (o.def.boss ? 3 : 1) + o.dmg * 10;
  UnitFX.libra = {
    update(b, u, dt) {
      const d = u.def, m = u.mark;
      u.fxT -= dt;
      const valid = m && m.alive && Math.abs(m.x - u.x) <= d.range + 60;
      if (!valid) u.mark = null;
      if (!u.mark && u.fxT <= 0) {
        u.fxT = 0.25;
        let best = null, bs = -1;
        for (const o of b.team[1 - u.team]) {
          if (!o.alive) continue;
          const dd = (o.x - u.x) * u.dir;
          if (dd < -20 || dd > d.range) continue;
          const sc = strength(o);
          if (sc > bs) { bs = sc; best = o; }
        }
        if (best) { u.mark = best; b.text(best.x, best.y - 92 * best.s, 'WEIGHED', '#d8b4fe', 14, 0.8); b.sfx('hex', 0.3); }
      }
      if (u.mark) { u.mark.weakT = 0.35; u.mark.weakF = u.mark.def.boss ? d.weaken.boss : d.weaken.f; }
    },
    act(b, u) { return u.mark && u.mark.alive ? u.mark : null; },
    attack(b, u, src, dmg) {
      const m = u.mark;
      if (!m || !m.alive) return true;
      b.damage(m, dmg, src);
      b.slashFx(m.x, m.y - 34 * m.s, u.dir, 1);
      burst(b, m.x, m.y - 40 * m.s, 6, '#e9d5ff', 100);
      b.sfx('slash', 0.05);
      return true;
    },
    draw(b, ctx, u, t, layer) {
      const m = u.mark;
      if (layer !== 'under' || !m || !m.alive) return;
      const x1 = u.x - u.dir * 12 * u.s, y1 = u.y - 62 * u.s, x2 = m.x, y2 = m.y - 40 * m.s;
      ctx.save(); ctx.lineCap = 'round';
      for (const [w, c] of [[8, 'rgba(192,132,252,.25)'], [2.5, 'rgba(233,213,255,.9)']]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
        for (let i = 0; i <= 20; i++) { const k = i / 20; ctx.lineTo(U.lerp(x1, x2, k), U.lerp(y1, y2, k) + Math.sin(k * 12 - t * 8) * 4 * Math.sin(k * Math.PI)); }
        ctx.stroke();
      }
      ctx.restore();
    },
  };

  // ♏ Scorpio: stacking cosmic poison.
  UnitFX.scorpio = {
    update(b, u, dt) {
      if (Math.random() < dt * 5) b.part({ type: 'smoke', x: u.x + U.rand(-10, 10), y: u.y - U.rand(0, 30), vx: U.rand(-15, 15), vy: -15, life: 0.8, size: U.rand(4, 7), color: '#1e1033' });
    },
    hit(b, u, t) {
      if (t.isBase || !t.alive) return;
      const v = u.def.venom, boss = t.def.boss, active = t.poisonT > 0;
      t.poisonStacks = Math.min(boss ? v.bossMax : v.max, (active ? t.poisonStacks : 0) + 1);
      t.poisonDps = Math.max(active ? t.poisonDps : 0, v.dps * u.mult * (boss ? v.bossMult : 1));
      t.poisonT = v.dur;
    },
  };

  // ♐ Sagittarius: piercing straight shots, every 4th a long-range star arrow.
  UnitFX.sagittarius = {
    attack(b, u, src, dmg) {
      const v = u.def.volley;
      u.hits++;
      const big = u.hits % v.every === 0;
      b.launchLinear(u, 'pierce', {
        speed: big ? 900 : 760, maxDist: big ? v.range : u.def.range + 40, enhanced: big, dmg: dmg * (big ? v.mult : 1),
        onHit: (bb, p, o) => { bb.damage(o, p.dmg, p.src); bb.spark(o.x, o.y - 30 * o.s, big ? '#fde047' : '#bae6fd', 5); },
        onBase: (bb, p, base) => bb.damage(base, p.dmg, p.src),
        trailFx: (bb, p) => bb.part({ type: 'star', x: p.x - p.dir * 12, y: p.y + U.rand(-3, 3), vx: -p.dir * 40, vy: U.rand(-20, 20), life: big ? 0.6 : 0.35, size: big ? 3.5 : 2.2, color: big ? '#fde047' : '#bae6fd' }),
      });
      b.sfx('arrow', 0.05);
      if (big) { b.sfx('magic', 0.1); b.text(u.x, u.y - 84 * u.s, 'STAR ARROW', '#fde047', 14, 0.8); }
      return true;
    },
  };

  // ♑ Capricorn: gravity field that slows (weaker foes more) and interrupts Boomers.
  UnitFX.capricorn = {
    update(b, u) {
      const g = u.def.gravity, cx = u.x + u.dir * g.off;
      u.fieldX = cx;
      for (const o of b.team[1 - u.team]) {
        if (!o.alive || Math.abs(o.x - cx) > g.r) continue;
        const f = o.def.boss ? g.boss : (o.def.tier || 1) <= 2 ? g.weak : g.mid;
        o.gravF = o.gravT > 0 ? Math.min(o.gravF, f) : f;
        o.gravT = 0.2;
        if (o.def.attack === 'explode' && o.state === 'attack' && !o.interrupted) {
          o.interrupted = true; o.state = 'idle'; o.atkT = 0; o.atkCd = 1.5;
          b.text(o.x, o.y - 62 * o.s, 'INTERRUPTED', '#5eead4', 13, 0.8);
        }
      }
    },
    draw(b, ctx, u, t, layer) {
      if (layer !== 'under' || u.fieldX == null || u.stunT > 0) return;
      const g = u.def.gravity, cx = u.fieldX, cy = GROUND_Y + LANE_H / 2 + 2;
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(t * 3) * 0.05; ctx.fillStyle = '#14b8a6';
      ctx.beginPath(); ctx.ellipse(cx, cy, g.r, 20, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.75; ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = t * 30;
      ctx.beginPath(); ctx.ellipse(cx, cy, g.r, 20, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 6; i++) {
        const a = t * 0.6 + (i / 6) * TAU, x = cx + Math.cos(a) * g.r * 0.7, y = cy + Math.sin(a) * 13;
        ctx.strokeStyle = '#99f6e4'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke();
      }
      for (let i = 0; i < 5; i++) {
        const x = cx + ((i * 61 + t * 40) % (g.r * 2)) - g.r, y = cy - 70 + ((t * 120 + i * 37) % 70);
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#5eead4'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 10); ctx.stroke();
      }
      ctx.restore();
    },
  };

  // ♒ Aquarius: a rolling wave that pushes back and slows everything it touches.
  UnitFX.aquarius = {
    update(b, u, dt) { if (Math.random() < dt * 3) b.part({ type: 'smoke', x: u.x + U.rand(-6, 6), y: u.y - U.rand(5, 40) * u.s, vx: 0, vy: 30, life: 0.5, size: 2, color: '#67e8f9' }); },
    attack(b, u, src, dmg) {
      const td = u.def.tide;
      b.launchLinear(u, 'wave', {
        x: u.x + u.dir * 24, y: GROUND_Y + 14, speed: td.speed, maxDist: td.dist, dmg,
        onHit: (bb, p, o) => {
          bb.damage(o, p.dmg, p.src);
          if (!o.alive) return;
          o.slowT = Math.max(o.slowT, td.slow);
          if (o.state !== 'kb') bb.knockback(o, o.def.boss ? 0.4 : 1.1);
          for (let i = 0; i < 6; i++) bb.part({ type: 'smoke', x: o.x, y: o.y - U.rand(10, 40), vx: U.rand(-60, 60), vy: U.rand(-90, -20), life: 0.5, size: U.rand(3, 5), color: '#a5f3fc' });
        },
        trailFx: (bb, p) => bb.part({ type: 'smoke', x: p.x - p.dir * 30, y: p.y - U.rand(0, 40), vx: -p.dir * 30, vy: -20, life: 0.5, size: U.rand(3, 6), color: '#a5f3fc' }),
      });
      b.sfx('tide', 0.2);
      return true;
    },
  };

  // ♓ Pisces: astral fish decoys.
  UnitFX.pisces = {
    act(b, u, tgt) { return tgt && u.minions < u.def.dream.max ? tgt : null; },
    attack(b, u) {
      const dr = u.def.dream, n = Math.min(dr.n, dr.max - u.minions);
      for (let k = 0; k < n && b.team[u.team].length < UNIT_CAP; k++) {
        const f = b.spawnUnit(ZODIAC_SPAWNED.dreamfish, u.team, u.mult, { x: u.x + u.dir * (16 + k * 14), life: dr.life, owner: u });
        f.seed = k * 1.3 + Math.random();
        u.minions++;
        burst(b, f.x, f.y - 26, 6, k % 2 ? '#a5f3fc' : '#f0abfc', 90);
      }
      b.sfx('dream', 0.2);
      return true;
    },
  };

  // Purity trait: Thornback reflects damage to nearby attackers.
  UnitFX.thorns = {
    hurt(b, u, amt, src) {
      const a = src.unit;
      if (!a || !a.alive || a.team === u.team || Math.abs(a.x - u.x) > 110) return;
      b.damage(a, amt * 0.4, { team: u.team, reflect: true, unit: u });
      for (let i = 0; i < 3; i++) b.part({ type: 'spark', x: a.x, y: a.y - 30 * a.s, vx: U.rand(-80, 80), vy: U.rand(-80, 20), life: 0.3, size: 2.5, color: '#4ade80' });
    },
  };
})();
