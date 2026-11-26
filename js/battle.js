'use strict';
/* =========================================================
   Battle engine: units, combat, projectiles, effects, waves,
   economy, thunder and rendering of a single battle.
   Team 0 = player (walks right), team 1 = enemy (walks left).
   ========================================================= */

const UNIT_CAP = 45, ENEMY_CAP = 38;
const UNIT_VIS = 1.18; // global size of stickmen on the battlefield
const BUFF = { dmg: 1.35, haste: 1.3, march: 1.15 }; // Rally Drummer aura
/* Ability modules (see abilities.js). Hooks: spawn, update, act, attackStart,
   attack, hit, hurt, kill, death, draw(layer). */
const UnitFX = {};
/* Evo moves (see abilities.js). A unit runs its Evo move module first, then its base ability. */
const EvoFX = {};
/* Enemy traits (see gimmicks.js), switched on by the matching key in a unit's definition. */
const TraitFX = {};
const TRAITS = ['fly', 'plate', 'guard', 'phase', 'burrow', 'split'];
const fxList = u => u._fx || (u._fx = [u.def.evoMove && EvoFX[u.def.evoMove.type], u.def.fx && UnitFX[u.def.fx], ...TRAITS.map(k => u.def[k] && TraitFX[k])].filter(Boolean));
const DEATH_DUR = 0.9, KB_DIST = 64;
const THUNDER_REACH = 1100;

let _uid = 0;

/** Turn a level definition into a list of waves: [[{type, at, boss}], ...] */
function buildWaves(L) {
  const rng = U.rng(L.n * 7919 + 17);
  const waves = [];
  for (let i = 0; i < L.waves; i++) {
    const prog = L.waves > 1 ? i / (L.waves - 1) : 1;
    const entries = Object.entries(L.pool).map(([type, w]) => {
      const tier = ENEMIES[type].tier;
      const f = tier === 1 ? 1 : tier === 2 ? 0.35 + prog * 0.9 : 0.1 + prog * 0.8;
      return [type, w * f];
    });
    const n = Math.round(L.start + L.growth * i);
    const list = [];
    let t = 0;
    for (let k = 0; k < n; k++) {
      list.push({ type: U.weighted(entries, rng()), at: t });
      t += U.lerp(L.spacing[0], L.spacing[1], rng());
    }
    waves.push(list);
  }
  if (L.boss) waves[waves.length - 1].unshift({ type: L.boss, at: 0, boss: true });
  return waves;
}

function endlessWave(i) {
  const rng = U.rng(9001 + i * 7919);
  const pool = [['grunt', 3]];
  if (i >= 1) pool.push(['runner', 1.6]);
  if (i >= 2) pool.push(['slinger', 1.3]);
  if (i >= 3) pool.push(['brute', 0.9 + i * 0.03]);
  if (i >= 5) pool.push(['boomer', 1]);
  if (i >= 6) pool.push(['hexer', 0.9]);
  if (i >= 8) pool.push(['knight', 0.8 + i * 0.03]);
  const n = Math.round(4 + i * 1.25);
  const list = [];
  let t = 0;
  for (let k = 0; k < n; k++) { list.push({ type: U.weighted(pool, rng()), at: t }); t += U.lerp(0.8, 1.8, rng()); }
  if ((i + 1) % 5 === 0) {
    const bosses = ['warlord', 'titan', 'shadow'];
    list.unshift({ type: bosses[((i + 1) / 5 - 1) % 3], at: 0, boss: true, bossMult: 0.45 + 0.04 * i });
  }
  return list;
}
const endlessMult = i => 1 + 0.11 * i + 0.006 * i * i;

class Battle {
  constructor(level, opts = {}) {
    this.L = level;
    this.demo = !!opts.demo;
    this.endless = !!level.endless;
    this.silent = this.demo;
    this.W = level.width;
    this.mods = opts.mods || Progress.mods();
    this.roster = (opts.roster || []).filter(r => r.unlocked !== false);
    this.rosterById = {};
    for (const r of this.roster) this.rosterById[r.def.id] = r;
    this.shakeOn = opts.shake !== false;
    this.autoCam = opts.autoCam !== false; this.idleCam = 0;

    this.t = 0; this.speed = 1; this.paused = false;
    this.units = []; this.projs = []; this.parts = []; this.texts = []; this.bolts = [];
    this.team = [[], []];
    this.events = [];
    this.shake = 0; this.hitstop = 0; this.flash = 0; this.flashCol = '#ffffff';

    const pHp = Math.round(2500 * this.mods.baseHp);
    this.pBase = { team: 0, isBase: true, x: 110, front: 168, hp: pHp, maxHp: pHp, hitT: 0, destroyed: false, destroyT: 0 };
    const eHp = level.baseHp || 1000;
    this.eBase = { team: 1, isBase: true, x: this.W - 110, front: this.W - 168, hp: eHp, maxHp: eHp, hitT: 0, destroyed: false, destroyT: 0,
      invuln: this.endless || this.demo, portal: this.endless };
    if (this.demo) this.pBase.invuln = true;

    this.gold = this.mods.startGold; this.walletLv = 1;
    this.cd = {}; for (const r of this.roster) this.cd[r.def.id] = 0;
    this.thunder = 0.25; this.thunderNotified = false;

    this.waves = this.endless || this.demo ? null : buildWaves(level);
    this.totalWaves = this.endless ? Infinity : this.demo ? Infinity : this.waves.length;
    this.waveIdx = 0; this.waveTimer = 3.5; this.waveGap = level.gap || 15; this.waveLen = 3.5;
    this.queue = []; this.loop = 0;
    this.bossSpawned = false; this.rushDone = false; this.boss = null;

    this.state = this.demo ? 'play' : 'intro'; this.introT = 0;
    this.result = null; this.endT = 0; this.endFired = false;
    this.stats = { summoned: 0, kills: 0, dmgDealt: 0, time: 0, spent: 0, thunders: 0, bossKills: 0 };

    this.camX = this.demo ? Math.max(0, (this.W - VIEW_W) / 2) : Math.max(0, this.W - VIEW_W);
    this.camV = 0; this.dragging = false; this.camTarget = null;
    this.input = { left: false, right: false };

    this.theme = THEMES[level.theme] || THEMES.meadow;
    this.scenery = null;
    this.clouds = Scenery.makeClouds(this.W);
    this.weather = Scenery.makeWeather(this.theme.weather);
    this.demoT = 0.4; this.demoET = 1.2;
    this.lastDt = 0;
    this.rules = level.rules || {};
    if (!this.demo) this.initRules();
  }

  // ---------- helpers ----------
  emit(type, data) { this.events.push(Object.assign({ type }, data)); }
  sfx(name, gap) { if (!this.silent) Sound.play(name, gap); }
  addShake(v) { if (this.shakeOn) this.shake = Math.min(22, Math.max(this.shake, v)); }
  walletRate() {
    let aura = 0;
    for (const u of this.team[0]) if (u.alive && u.def.goldAura) aura = Math.max(aura, u.def.goldAura);
    return Wallet.rate(this.walletLv) * this.mods.goldMult * (1 + aura);
  }
  walletMax() { return Wallet.max(this.walletLv); }
  walletCost() { return Wallet.cost(this.walletLv); }
  unitY(u) { return GROUND_Y + u.lane * LANE_H; }

  // ---------- player actions ----------
  summon(id) {
    if (this.state !== 'play') return 'wait';
    const r = this.rosterById[id];
    if (!r) return 'locked';
    if (this.rules.costCap && r.def.cost > this.rules.costCap) return 'banned';
    if (this.cd[id] > 0) return 'cooldown';
    if (this.rules.unitCap && this.armySize() >= this.rules.unitCap) return 'army';
    if (this.gold < r.def.cost) return 'gold';
    if (this.team[0].length >= UNIT_CAP) return 'cap';
    this.gold -= r.def.cost;
    this.stats.spent += r.def.cost;
    this.cd[id] = r.def.cd * this.mods.cdMult;
    const u = this.spawnUnit(r.def, 0, r.mult || Progress.unitMult(r.lv));
    u.summoned = true;
    this.stats.summoned++;
    this.puff(u.x, u.y - 20, '#ffffff', 10);
    this.ring(u.x, u.y - 20, r.def.color, 30);
    this.sfx('summon', 0.05);
    return 'ok';
  }
  upgradeWallet() {
    if (this.state !== 'play') return 'wait';
    if (this.walletLv >= WALLET_MAX_LV) return 'max';
    const c = this.walletCost();
    if (this.gold < c) return 'gold';
    this.gold -= c;
    this.walletLv++;
    this.sfx('upgrade');
    this.text(this.pBase.x, BASE_GY - 380, 'WALLET UP!', '#ffd23f', 30, 1.4);
    for (let i = 0; i < 14; i++) this.part({ type: 'coin', x: this.pBase.x + U.rand(-50, 50), y: BASE_GY - 200, vx: U.rand(-80, 80), vy: U.rand(-300, -150), g: 700, life: 1, size: 5 });
    return 'ok';
  }
  fireThunder() {
    if (this.state !== 'play' || this.thunder < 1) return false;
    this.thunder = 0; this.thunderNotified = false; this.stats.thunders++;
    const reach = this.pBase.x + THUNDER_REACH;
    const targets = this.team[1].filter(u => u.x <= reach);
    const dmg = this.mods.thunderDmg;
    let shown = 0;
    for (const u of targets) {
      if (shown < 16) { this.bolt(u.x, u.y - 30 * u.s); shown++; }
      this.damage(u, dmg, { team: 0, kbForce: !u.def.boss, stun: 1.0, thunder: true });
    }
    if (!targets.length) {
      // nothing in range: strike the empty ground ahead of our front line for show
      const front = this.team[0].reduce((m, u) => Math.max(m, u.x), this.pBase.front);
      for (let i = 0; i < 3; i++) this.bolt(Math.min(reach, front + 120 + i * 140 + Math.random() * 60), GROUND_Y + 10);
    }
    this.flash = 0.6; this.flashCol = '#fff8d0';
    if (this.dark) this.darkLift = 4;
    this.addShake(14); this.hitstop = 0.06;
    this.sfx('thunder', 0.1);
    this.emit('banner', { text: 'THUNDER!', cls: 'gold', small: targets.length ? `${targets.length} enemies struck` : '' });
    return true;
  }

  // ---------- spawning ----------
  spawnUnit(def, team, mult, opts = {}) {
    const hpMult = team === 0 ? mult : mult * (opts.bossMult || 1);
    const dmgMult = team === 0 ? mult : 1 + (mult - 1) * (def.boss ? 0.45 : 0.7);
    const u = {
      id: ++_uid, def, team, dir: team === 0 ? 1 : -1, s: (def.scale || 1) * UNIT_VIS,
      hp: def.hp * hpMult, maxHp: def.hp * hpMult, dmg: def.dmg * dmgMult, heal: (def.heal || 0) * mult,
      speed: def.speed * U.rand(0.94, 1.06), alive: true, remove: false,
      x: opts.x != null ? opts.x : team === 0 ? this.pBase.x + 46 : this.eBase.x - 46,
      lane: Math.random(), state: 'walk', phase: Math.random() * TAU, seed: Math.random() * 100,
      atkCd: U.rand(0.05, 0.3), atkT: 0, animDur: def.animDur || 0.5, hitAt: def.hitAt || (Stick.ANIMS[def.anim] || Stick.ANIMS.slash).hit, hitDone: false,
      kbIdx: 0, kbT: 0, kbX0: 0, kbDist: 0, flash: 0, slowT: 0, stunT: 0, deadT: 0,
      healT: def.healPulse ? def.healPulse.every * 0.5 : 0, sumT: def.summon ? def.summon.every * 0.6 : 0,
      lastStep: 0, mult, age: 0, buffT: 0, auraT: 0, minions: 0, wall: null, owner: opts.owner || null,
      lifeLeft: opts.life || 0,
      shieldHp: 0, shieldT: 0, barrierT: 0, radT: 0, roarT: 0, hasteT: 0, weakT: 0, weakF: 1,
      poisonT: 0, poisonStacks: 0, poisonDps: 0, gravT: 0, gravF: 1, hits: 0, fxT: 0, anchored: false, anchorWalk: false, sparkT: 0,
    };
    if (opts.lane != null) u.lane = opts.lane;
    u.y = this.unitY(u);
    this.units.push(u);
    this.callFx(u, 'spawn');
    if (def.boss && team === 1) {
      this.boss = u; this.bossSpawned = true;
      this.emit('boss', { name: def.name });
      this.emit('banner', { text: 'BOSS INCOMING!', cls: 'red', small: def.name });
      this.sfx('boss', 0.5); this.addShake(10);
      for (let i = 0; i < 20; i++) this.part({ type: 'smoke', x: u.x + U.rand(-50, 50), y: u.y - U.rand(0, 60), vx: U.rand(-40, 40), vy: U.rand(-60, -10), life: 1.2, size: U.rand(10, 22), color: '#3b2b4a' });
    }
    return u;
  }
  spawnEnemy(type, mult, opts = {}) {
    const def = ENEMIES[type];
    if (!def) return null;
    if (def.boss) {
      if (this.bossSpawned && !this.endless) return null;
      opts.bossMult = opts.bossMult || this.L.bossMult || 1;
    }
    return this.spawnUnit(def, 1, mult, opts);
  }

  // ---------- waves ----------
  updateWaves(dt) {
    if (this.demo) {
      this.demoET -= dt;
      if (this.demoET <= 0 && this.team[1].length < 9) {
        this.demoET = U.rand(1.6, 3.2);
        this.spawnEnemy(U.pick(['grunt', 'grunt', 'runner', 'brute', 'slinger', 'knight', 'hexer']), 1.4);
      }
      return;
    }
    this.waveTimer -= dt;
    const alive = this.team[1].length;
    const pending = this.queue.length;
    if (this.waveIdx < this.totalWaves) {
      // call the next wave early once the field is clear
      if (this.waveIdx > 0 && pending === 0 && alive === 0 && this.waveTimer > 3) this.waveTimer = 3;
      if (this.waveTimer <= 0) this.startWave();
    } else if (this.waveTimer <= 0) {
      // overtime: the fortress keeps sending smaller groups of reinforcements
      this.loop++;
      const pickFrom = this.waves.slice(-3);
      const w = U.pick(pickFrom).filter(s => !s.boss);
      const n = Math.ceil(w.length * 0.35);
      const mult = this.L.mult * (1 + Math.min(0.5, 0.05 * this.loop));
      for (let i = 0; i < n; i++) this.queue.push({ type: w[i].type, t: this.t + i * 1.4, mult });
      this.waveTimer = this.waveGap * 1.2; this.waveLen = this.waveTimer;
    }
    // spawn queued enemies
    if (this.queue.length) {
      this.queue.sort((a, b) => a.t - b.t);
      while (this.queue.length && this.queue[0].t <= this.t && this.team[1].length < ENEMY_CAP) {
        const s = this.queue.shift();
        this.spawnEnemy(s.type, s.mult, { bossMult: s.bossMult });
      }
    }
  }
  startWave() {
    const i = this.waveIdx;
    let list, mult;
    if (this.endless) { list = endlessWave(i); mult = endlessMult(i); }
    else { list = this.waves[i]; mult = this.L.mult; }
    for (const s of list) {
      if (s.boss && this.bossSpawned && !this.endless) continue;
      this.queue.push({ type: s.type, t: this.t + s.at + (s.boss ? 0 : 0.6), mult, bossMult: s.bossMult });
    }
    this.waveIdx++;
    this.waveTimer = this.endless ? this.waveGap + Math.min(10, i * 0.4) : this.waveGap;
    this.waveLen = this.waveTimer;
    const final = !this.endless && this.waveIdx === this.totalWaves;
    this.emit('banner', { text: final ? 'FINAL WAVE' : `WAVE ${this.waveIdx}`, cls: final ? 'red' : '', small: this.endless && this.waveIdx > 1 ? 'Enemies grow stronger...' : '' });
    this.sfx('wave', 0.3);
  }
  enemyRush() {
    this.rushDone = true;
    const n = 2 + Math.floor(this.L.n / 3);
    const types = Object.keys(this.L.pool);
    for (let k = 0; k < n; k++) this.queue.push({ type: U.pick(types), t: this.t + 0.3 + k * 0.5, mult: this.L.mult });
    if (this.L.boss && !this.bossSpawned) this.queue.push({ type: this.L.boss, t: this.t + 0.2, mult: this.L.mult });
    this.emit('banner', { text: 'ENEMY RUSH!', cls: 'red', small: 'The fortress is furious!' });
    this.sfx('wave', 0.3);
  }

  // ---------- main update ----------
  /** Called once per rendered frame with real (unscaled) dt. */
  frame(dt) {
    this.lastDt = dt;
    this.updateCamera(dt);
    if (this.paused) return;
    for (let i = 0; i < this.speed; i++) this.update(dt);
  }

  update(dt) {
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.t += dt;
    const T0 = this.team[0], T1 = this.team[1];
    T0.length = 0; T1.length = 0;
    for (const u of this.units) if (u.alive) this.team[u.team].push(u);

    if (this.state === 'intro') {
      this.introT += dt;
      if (this.introT >= 2.5) this.beginPlay();
    } else if (this.state === 'play') {
      this.stats.time += dt;
      if (!this.demo) {
        this.gold = Math.min(this.walletMax(), this.gold + this.walletRate() * dt);
        for (const id in this.cd) if (this.cd[id] > 0) this.cd[id] = Math.max(0, this.cd[id] - dt);
        if (this.thunder < 1) {
          this.thunder = Math.min(1, this.thunder + dt / this.mods.thunderTime);
          if (this.thunder >= 1 && !this.thunderNotified) { this.thunderNotified = true; this.sfx('ready'); this.emit('thunderReady'); }
        }
      } else this.demoAI(dt);
      this.updateWaves(dt);
    }
    if (this.wind || this.dark) this.updateRules(dt);

    for (let i = 0; i < this.units.length; i++) this.updateUnit(this.units[i], dt);
    if (this.units.some(u => u.remove)) this.units = this.units.filter(u => !u.remove);
    if (this.boss && !this.boss.alive) this.boss = null;

    for (const p of this.projs) this.updateProj(p, dt);
    if (this.projs.some(p => p.done)) this.projs = this.projs.filter(p => !p.done);
    this.updateParts(dt);

    for (const b of [this.pBase, this.eBase]) {
      if (b.hitT > 0) b.hitT = Math.max(0, b.hitT - dt);
      if (b.destroyed) {
        b.destroyT += dt;
        if (b.destroyT < 1.5 && Math.random() < dt * 9) this.explosion(b.x + U.rand(-70, 70), BASE_GY - U.rand(20, 220), U.rand(30, 60), true);
      } else if (!b.invuln && b.hp / b.maxHp < 0.33 && Math.random() < dt * 3) {
        this.part({ type: 'smoke', x: b.x + U.rand(-40, 40), y: BASE_GY - U.rand(100, 230), vx: U.rand(-10, 10), vy: U.rand(-50, -25), life: 1.6, size: U.rand(8, 14), color: '#555' });
      }
    }

    if (this.state === 'end') {
      this.endT += dt;
      if (!this.endFired && this.endT > 2.6) { this.endFired = true; this.emit('end', { result: this.result }); }
    }
  }

  beginPlay() {
    this.state = 'play';
    this.emit('banner', { text: 'FIGHT!', cls: 'gold' });
    this.sfx('wave');
  }

  demoAI(dt) {
    this.demoT -= dt;
    if (this.demoT <= 0 && this.team[0].length < 9) {
      this.demoT = U.rand(1.2, 2.6);
      const pool = UNITS.filter(u => u.id !== 'giant' || Math.random() < 0.15);
      this.spawnUnit(U.pick(pool), 0, 1.5);
    }
  }

  updateCamera(dt) {
    if (this.demo) return;
    const maxX = Math.max(0, this.W - VIEW_W);
    if (this.state === 'intro') {
      const k = U.clamp((this.introT - 0.7) / 1.6, 0, 1);
      this.camX = U.lerp(maxX, 0, U.easeInOut(k));
      return;
    }
    if (this.state === 'end' && this.camTarget != null) {
      this.camX += (U.clamp(this.camTarget, 0, maxX) - this.camX) * Math.min(1, dt * 3);
      return;
    }
    const pan = 1000;
    this.idleCam = (this.idleCam || 0) + dt;
    if (this.input.left) { this.camX -= pan * dt; this.camV = 0; this.idleCam = 0; }
    if (this.input.right) { this.camX += pan * dt; this.camV = 0; this.idleCam = 0; }
    if (this.dragging || Math.abs(this.camV) > 20) this.idleCam = 0;
    if (!this.dragging) { this.camX += this.camV * dt; this.camV *= Math.exp(-dt * 5); }
    // Auto-follow the front line once the player leaves the camera alone for a while.
    if (this.autoCam && this.idleCam > 5 && this.state === 'play') {
      const target = U.clamp(this.frontFocus() - VIEW_W * 0.55, 0, maxX);
      this.camX += (target - this.camX) * Math.min(1, dt * 1.2);
    }
    this.camX = U.clamp(this.camX, 0, maxX);
  }
  /** Where the action is: the point where the two armies meet. */
  frontFocus() {
    let p = -1, e = Infinity;
    for (const u of this.team[0]) if (u.alive && u.x > p) p = u.x;
    for (const u of this.team[1]) if (u.alive && u.x < e) e = u.x;
    if (p < 0 && e === Infinity) return this.pBase.x + 300;
    if (p < 0) return Math.max(this.pBase.x + 300, e - 200);
    if (e === Infinity) return p + 150;
    return Math.min(p, e) + Math.min(250, Math.abs(e - p) / 2 + 80);
  }
  /** Called by the UI whenever the player moves the camera manually. */
  touchCam() { this.idleCam = 0; }
  skipIntro() { if (this.state === 'intro') { this.introT = 2.5; } }

  // ---------- units ----------
  findTarget(u, range) {
    const foes = this.team[1 - u.team];
    let best = null, bd = Infinity, air = null, ad = Infinity;
    for (let i = 0; i < foes.length; i++) {
      const o = foes[i];
      if (!o.alive || !this.canTarget(u, o)) continue;
      const d = (o.x - u.x) * u.dir;
      if (d < -20 || d > range) continue;
      if (d < bd) { bd = d; best = o; }
      if (o.fly && d < ad) { ad = d; air = o; }
    }
    if (air) return air; // anti-air instinct: flyers first
    if (best) return best;
    const base = u.team === 0 ? this.eBase : this.pBase;
    if (!base.destroyed && (base.front - u.x) * u.dir <= range) return base;
    return null;
  }
  targetsInRange(u, range) {
    const out = [];
    for (const o of this.team[1 - u.team]) {
      if (!o.alive || !this.canTarget(u, o)) continue;
      const d = (o.x - u.x) * u.dir;
      if (d >= -24 && d <= range) out.push(o);
    }
    const base = u.team === 0 ? this.eBase : this.pBase;
    if (!base.destroyed && (base.front - u.x) * u.dir <= range) out.push(base);
    return out;
  }
  injuredNear(u) {
    const r = u.def.healR || 150;
    for (const o of this.team[u.team]) if (o.alive && o.hp < o.maxHp * 0.92 && Math.abs(o.x - u.x) <= r) return true;
    return false;
  }
  clampUnit(u) {
    if (u.team === 0) u.x = U.clamp(u.x, this.pBase.front - 40, this.eBase.front + 6);
    else u.x = U.clamp(u.x, this.pBase.front - 6, this.eBase.front + 40);
  }

  updateUnit(u, dt) {
    if (u.flash > 0) u.flash -= dt;
    if (!u.alive) {
      u.deadT += dt;
      if (u.deadT < 0.5) u.x -= u.dir * 80 * dt * (1 - u.deadT / 0.5) / Math.sqrt(u.s);
      if (u.deadT >= DEATH_DUR) u.remove = true;
      return;
    }
    if (this.state === 'end') {
      if (u.state !== 'cheer') { u.state = 'cheer'; }
      return;
    }
    const d = u.def;
    u.age += dt;
    if (u.lifeLeft > 0) { u.lifeLeft -= dt; if (u.lifeLeft <= 0) { this.kill(u, { team: -1 }, true); return; } }
    if (d.structure) return;
    this.tickStatus(u, dt);
    if (!u.alive) return;
    if (u.slowT > 0) u.slowT -= dt;
    if (u.buffT > 0) u.buffT -= dt;
    const haste = (u.buffT > 0 ? BUFF.haste : 1) * (u.roarT > 0 ? 1.4 : 1) * (u.hasteT > 0 ? 1.4 : 1);
    const slow = (u.slowT > 0 ? 0.5 : 1) * haste;
    if (d.aura && this.state === 'play') {
      u.auraT -= dt;
      if (u.auraT <= 0) { u.auraT = d.aura.every; this.rallyPulse(u); }
    }

    if (u.state === 'kb') {
      u.kbT += dt;
      const k = Math.min(1, u.kbT / Stick.KB_DUR);
      u.x = u.kbX0 - u.dir * u.kbDist * U.easeOut(k);
      this.clampUnit(u);
      if (k >= 1) { u.state = 'walk'; this.dust(u.x, u.y, 4 * u.s); }
      return;
    }
    if (u.frozenT > 0) u.frozenT -= dt;
    if (u.stunT > 0) { u.stunT -= dt; if (u.state === 'attack' || u.state === 'walk') u.state = 'idle'; return; }
    const mods = fxList(u);
    for (const m of mods) if (m.update) { m.update(this, u, dt); if (!u.alive) return; }

    if (d.healPulse) {
      u.healT -= dt;
      if (u.healT <= 0) { u.healT = d.healPulse.every; this.healPulse(u, d.healPulse.amt * (u.maxHp / d.hp), d.healPulse.r, '#4ade80'); }
    }
    if (d.summon && this.state === 'play') {
      u.sumT -= dt;
      if (u.sumT <= 0) {
        u.sumT = d.summon.every;
        for (let k = 0; k < d.summon.n; k++) {
          if (this.team[1].length >= ENEMY_CAP) break;
          const m = this.spawnEnemy(d.summon.type, this.L.mult || 1, { x: u.x + 30 + k * 22 });
          if (m) this.puff(m.x, m.y - 20, '#7c3aed', 8);
        }
        this.ring(u.x, u.y - 40, '#a855f7', 90);
        this.sfx('hex', 0.2);
      }
    }

    u.atkCd -= dt * slow;
    if (u.state === 'attack') {
      u.atkT += dt * slow;
      const k = u.atkT / u.animDur;
      if (!u.hitDone && k >= u.hitAt) {
        u.hitDone = true;
        this.performAttack(u);
        if (!u.alive) return;
      }
      if (k >= 1) u.state = 'idle';
      return;
    }

    const tgt = this.findTarget(u, d.range);
    const act = d.attack === 'heal' ? this.injuredNear(u)
      : d.attack === 'none' ? null
      : d.attack === 'paint' ? (tgt && u.minions < d.minions.max ? tgt : null)
      : d.attack === 'build' ? (tgt && !(u.wall && u.wall.alive) ? tgt : null)
      : tgt;
    let act2 = act;
    for (const m of mods) if (m.act) { act2 = m.act(this, u, tgt); break; }
    if (act2 && u.atkCd <= 0) {
      u.state = 'attack'; u.atkT = 0; u.hitDone = false; u.atkCd = d.rate;
      this.callFx(u, 'attackStart');
      if (d.attack === 'explode') this.sfx('kb', 0.1);
    } else if (tgt) {
      u.state = 'idle';
    } else if (u.anchored) {
      u.state = u.anchorWalk ? 'walk' : 'idle';
      if (u.anchorWalk) u.phase += (u.speed * dt * 0.13) / u.s;
    } else {
      u.state = 'walk';
      const v = u.speed * this.moveMult(u);
      u.x += u.dir * v * dt;
      const prev = u.phase;
      u.phase += (v * dt * 0.13) / u.s;
      if (d.heavy && Math.floor(prev / Math.PI) !== Math.floor(u.phase / Math.PI)) {
        this.dust(u.x + u.dir * 6 * u.s, u.y, 2 + u.s * 1.5);
        if (u.s > 2) this.sfx('basehit', 0.25);
      }
      this.clampUnit(u);
    }
  }

  performAttack(u) {
    const d = u.def;
    const src = { team: u.team, kbChance: d.kbChance, crit: d.crit, slow: d.slow, unit: u };
    const dmg = this.dmgOf(u);
    if (this.callFx(u, 'attack', src, dmg)) return;
    switch (d.attack) {
      case 'melee': {
        const t = this.findTarget(u, d.range + 12);
        if (t) {
          this.damage(t, dmg, src);
          const hx = t.isBase ? t.front : t.x - t.dir * 4 * t.s;
          if (d.anim === 'slash' || d.anim === 'ninja') this.slashFx(hx, u.y - 30 * u.s, u.dir, u.s);
          this.sfx(d.anim === 'punch' ? 'punch' : d.anim === 'slash' || d.anim === 'ninja' ? 'slash' : 'hit', 0.04);
          if (d.armor || d.id === 'knight') this.sfx('clang', 0.08);
          if (d.shake) this.addShake(d.shake * 0.6);
        }
        break;
      }
      case 'area': {
        const list = this.targetsInRange(u, d.range + 12);
        for (const t of list) this.damage(t, dmg, src);
        const ix = u.x + u.dir * Math.min(d.range, 50) * u.s * 0.6;
        if (d.anim === 'slam' || d.anim === 'sweep') {
          this.shockwave(ix, u.y, u.s);
          this.sfx('heavy', 0.1);
          if (d.shake) { this.addShake(d.shake); this.hitstop = Math.max(this.hitstop, 0.04); }
        } else {
          for (const t of list) if (!t.isBase) this.spark(t.x, t.y - 26 * t.s, '#fff3a0', 5);
          this.sfx('slash', 0.05);
        }
        break;
      }
      case 'arrow': case 'rock': {
        const t = this.findTarget(u, d.range + 20);
        if (t) this.launch(u, t, d.attack);
        this.sfx(d.attack === 'arrow' ? 'arrow' : 'throw', 0.05);
        break;
      }
      case 'bomb': {
        const t = this.findTarget(u, d.range + 20);
        if (t) this.launch(u, t, 'bomb');
        this.sfx('throw', 0.05);
        break;
      }
      case 'magic': case 'hex': {
        const t = this.findTarget(u, d.range + 20);
        if (t) this.launch(u, t, d.attack);
        this.sfx(d.attack === 'magic' ? 'magic' : 'hex', 0.08);
        break;
      }
      case 'heal': {
        this.healPulse(u, u.heal, d.healR, '#86efac');
        break;
      }
      case 'erase': {
        const t = this.findTarget(u, d.range + 12);
        if (!t) break;
        this.slashFx(t.isBase ? t.front : t.x, u.y - 30 * u.s, u.dir, u.s * 1.2);
        this.sfx('erase', 0.06);
        if (t.isBase) { this.damage(t, dmg, src); break; }
        this.damage(t, dmg + t.maxHp * (t.def.boss ? 0.04 : d.pctDmg), src);
        for (let i = 0; i < 6; i++) this.part({ type: 'debris', x: t.x, y: t.y - 30 * t.s, vx: U.rand(-90, 90), vy: U.rand(-200, -60), g: 800, life: 0.6, size: U.rand(2, 4), color: '#f9a8d4', rot: 0, vr: U.rand(-8, 8) });
        if (t.alive && !t.def.boss && t.hp / t.maxHp < d.execute) this.erase(t, src);
        else if (t.alive) this.callFx(u, 'eraseHit', t);
        break;
      }
      case 'chrono': {
        const t = this.findTarget(u, d.range + 20);
        if (!t) break;
        const cx = t.isBase ? t.front : t.x, cy = GROUND_Y - 20;
        this.part({ type: 'clock', x: cx, y: cy - 30, life: 1.1, size: d.aoe });
        this.ring(cx, cy, '#7dd3fc', d.aoe * 1.3);
        this.flash = Math.max(this.flash, 0.12); this.flashCol = '#bae6fd';
        this.sfx('chrono', 0.2);
        for (const o of this.team[1 - u.team]) {
          if (!o.alive || Math.abs(o.x - cx) > d.aoe) continue;
          this.damage(o, dmg, src);
          if (!o.alive) continue;
          const f = o.def.boss ? 0.7 : d.freeze;
          o.stunT = Math.max(o.stunT, f); o.frozenT = Math.max(o.frozenT || 0, f);
          if (o.state === 'attack') { o.state = 'idle'; o.atkCd = Math.max(o.atkCd, 0.3); }
        }
        if (t.isBase) this.damage(t, dmg, src);
        break;
      }
      case 'build': {
        const t = this.findTarget(u, d.range + 20);
        const front = t && !t.isBase ? t.x - u.dir * 26 : u.x + u.dir * 70;
        const x = u.dir > 0 ? U.clamp(front, u.x + 24, u.x + 90) : U.clamp(front, u.x - 90, u.x - 24);
        const w = this.spawnUnit(SPAWNED.wall, u.team, u.mult, { x, life: d.build.life, lane: 0.55, owner: u });
        w.maxHp = w.hp = d.build.hp * u.mult;
        u.wall = w;
        this.dust(x, w.y, 10);
        for (let i = 0; i < 8; i++) this.part({ type: 'debris', x: x + U.rand(-20, 20), y: w.y - U.rand(0, 40), vx: U.rand(-60, 60), vy: U.rand(-160, -40), g: 700, life: 0.6, size: 3, color: '#d6a15c', rot: 0, vr: 6 });
        this.text(x, w.y - 80, 'BARRICADE!', '#fde68a', 18, 1);
        this.sfx('build', 0.2);
        break;
      }
      case 'paint': {
        const n = Math.min(d.minions.n, d.minions.max - u.minions);
        for (let k = 0; k < n && this.team[u.team].length < UNIT_CAP; k++) {
          const m = this.spawnUnit(SPAWNED.doodle, u.team, u.mult, { x: u.x + u.dir * (24 + k * 14), life: d.minions.life, owner: u });
          u.minions++;
          for (let i = 0; i < 6; i++) this.part({ type: 'smoke', x: m.x + U.rand(-8, 8), y: m.y - U.rand(10, 50), vx: U.rand(-30, 30), vy: U.rand(-40, 0), life: 0.5, size: U.rand(4, 7), color: '#3b82f6' });
        }
        this.sfx('paint', 0.2);
        break;
      }
      case 'explode': {
        this.areaBlast(u.x + u.dir * 10, dmg, d.aoe, u.team, src);
        this.kill(u, { team: -1 }, true);
        break;
      }
    }
  }

  healPulse(u, amt, r, col) {
    let healed = 0;
    for (const o of this.team[u.team]) {
      if (!o.alive || Math.abs(o.x - u.x) > r || o.hp >= o.maxHp || (o.def.boss && u.team === 1)) continue;
      const before = o.hp;
      o.hp = Math.min(o.maxHp, o.hp + amt);
      if (o.hp > before) {
        healed++;
        for (let i = 0; i < 3; i++) this.part({ type: 'plus', x: o.x + U.rand(-10, 10), y: o.y - U.rand(20, 50) * o.s, vx: 0, vy: -40, life: 0.9, size: 5, color: col });
      }
    }
    this.ring(u.x, u.y - 30, col, r * 0.8);
    if (healed && u.team === 0) this.sfx('heal', 0.15);
  }

  /** Apply damage to a unit or base. src: {team, kbChance, crit, slow, stun, kbForce} */
  damage(t, amt, src) {
    if (t.isBase) return this.damageBase(t, amt);
    if (!t.alive) return;
    const d = t.def;
    if (t.trait && this.traitBlock(t, src)) return;
    if (d.dodge && !src.thunder && !src.sure && Math.random() < d.dodge) { this.text(t.x, t.y - 70 * t.s, 'MISS', '#ffffff', 18, 0.7); return; }
    let crit = false;
    if (src.crit && Math.random() < src.crit) { crit = true; amt *= 2.2; this.text(t.x, t.y - 74 * t.s, 'CRIT!', '#ffd23f', 22, 0.8); }
    amt *= 1 - (d.armor || 0);
    if (t.trait) amt = this.traitReduce(t, amt, src, crit);
    if (t.barrierT > 0) amt *= 0.6;
    if (t.shieldHp > 0) {
      const a = Math.min(t.shieldHp, amt);
      t.shieldHp -= a; amt -= a;
      if (amt <= 0.01) { this.spark(t.x - t.dir * 6 * t.s, t.y - 30 * t.s, '#86efac', 4); return; }
    }
    if (src.team === 0) this.stats.dmgDealt += Math.min(amt, t.hp);
    t.hp -= amt; t.flash = 0.1;
    this.spark(t.x - t.dir * 4 * t.s, t.y - 28 * t.s, t.team === 0 ? '#ffe7a0' : '#ffffff', 6);
    if (src.slow) { t.slowT = Math.max(t.slowT, src.slow); }
    if (src.unit && !src.reflect) this.callFx(src.unit, 'hit', t, amt, src);
    if (t.hp <= 0) { this.kill(t, src); return; }
    if (!src.reflect) { this.callFx(t, 'hurt', amt, src); if (!t.alive) return; }
    if (d.structure) return;
    if (src.stun) t.stunT = Math.max(t.stunT, src.stun);
    const kb = d.kb || 1, kr = d.kbResist || 0;
    const idx = Math.floor((1 - t.hp / t.maxHp) * kb);
    if (idx > t.kbIdx) { t.kbIdx = idx; if (kr < 1) this.knockback(t, 1 - kr * 0.75); }
    else if (kr < 0.5 && (src.kbForce || (src.kbChance && Math.random() < src.kbChance)) && !(d.boss && !src.kbForce) && t.state !== 'kb') {
      if (!d.boss || Math.random() < 0.3) this.knockback(t, 0.8);
    }
  }
  damageBase(b, amt) {
    if (b.destroyed || this.state === 'end') return;
    b.hitT = 0.15;
    for (let i = 0; i < 3; i++) this.part({ type: 'debris', x: b.front + U.rand(-10, 10), y: BASE_GY - U.rand(30, 180), vx: -b.team * 0 + (b.team === 0 ? U.rand(-60, 120) : U.rand(-120, 60)), vy: U.rand(-220, -60), g: 900, life: 0.9, size: U.rand(3, 6), color: b.team === 0 ? '#e6dccb' : '#4a3f4f', rot: Math.random() * 6, vr: U.rand(-10, 10) });
    if (b.invuln) return;
    if (b.shielded) {
      if (this.t - (b.noteT || -9) > 0.8) { b.noteT = this.t; this.text(b.front, BASE_GY - 160, 'SHIELDED', '#fde047', 18, 0.7); this.sfx('clang', 0.2); }
      return;
    }
    if (b.team === 1) this.stats.dmgDealt += Math.min(amt, b.hp);
    b.hp -= amt;
    this.sfx('basehit', 0.12);
    if (b.team === 1 && !this.rushDone && !this.endless && b.hp / b.maxHp < 0.5) this.enemyRush();
    if (b.hp <= 0) this.destroyBase(b);
  }
  destroyBase(b) {
    b.hp = 0; b.destroyed = true; b.destroyT = 0;
    this.state = 'end';
    this.result = b.team === 1 ? 'win' : 'lose';
    this.addShake(20); this.flash = 0.7; this.flashCol = '#ffffff';
    this.hitstop = 0.12;
    this.camTarget = b.x - VIEW_W / 2;
    this.sfx('explode', 0);
    for (const u of this.units) if (u.alive && u.team === b.team) this.kill(u, { team: -1 }, true);
    this.queue.length = 0;
    for (const p of this.projs) p.done = true;
    this.emit('baseDestroyed', { result: this.result });
  }
  knockback(t, f = 1) {
    if (!t.alive) return;
    t.state = 'kb'; t.kbT = 0; t.kbX0 = t.x;
    t.kbDist = (KB_DIST * f) / Math.sqrt(t.s);
    t.atkT = 0; t.hitDone = true;
    this.sfx('kb', 0.08);
  }
  kill(u, src, noReward) {
    if (!u.alive) return;
    u.alive = false; u.state = 'dead'; u.deadT = 0; u.hp = 0;
    if (src && src.unit && src.unit.alive) this.callFx(src.unit, 'kill', u);
    this.callFx(u, 'death', src);
    if (u.team === 1) {
      if (!noReward && !this.demo) {
        const g = Math.round(u.def.reward * this.mods.bounty * (this.endless ? 1 + this.waveIdx * 0.03 : 1));
        this.gold = Math.min(this.walletMax(), this.gold + g);
        this.text(u.x, u.y - 60 * u.s, `+${g}`, '#ffd23f', 18, 0.9);
        this.part({ type: 'coin', x: u.x, y: u.y - 40 * u.s, vx: U.rand(-40, 40), vy: -220, g: 600, life: 0.7, size: 5 });
        this.sfx('coin', 0.06);
        this.stats.kills++;
      }
      this.sfx('edeath', 0.06);
      for (let i = 0; i < 6; i++) this.part({ type: 'smoke', x: u.x + U.rand(-10, 10), y: u.y - U.rand(10, 40) * u.s, vx: U.rand(-30, 30), vy: U.rand(-40, -10), life: 0.8, size: U.rand(5, 9) * u.s, color: '#3a3340' });
      if (u.def.boss) {
        if (!noReward) this.stats.bossKills++;
        this.emit('banner', { text: 'BOSS DEFEATED!', cls: 'gold' });
        this.explosion(u.x, u.y - 40 * u.s, 90, false);
        this.addShake(16);
      }
    } else if (u.def.structure) {
      this.sfx('basehit', 0.15);
      for (let i = 0; i < 12; i++) this.part({ type: 'debris', x: u.x + U.rand(-24, 24), y: u.y - U.rand(5, 55), vx: U.rand(-120, 120), vy: U.rand(-260, -60), g: 900, life: 0.9, size: U.rand(3, 6), color: i % 2 ? '#d6a15c' : '#a16207', rot: 0, vr: U.rand(-10, 10) });
    } else if (u.def.minion) {
      for (let i = 0; i < 8; i++) this.part({ type: 'smoke', x: u.x + U.rand(-8, 8), y: u.y - U.rand(5, 45), vx: U.rand(-40, 40), vy: U.rand(-30, 10), life: 0.6, size: U.rand(3, 6), color: u.def.color || '#1d4ed8' });
    } else {
      this.sfx('death', 0.06);
      this.part({ type: 'ghost', x: u.x, y: u.y - 50 * u.s, vx: 0, vy: -45, life: 1.4, size: 7 * Math.sqrt(u.s) });
    }
    if (u.owner && u.def.minion) u.owner.minions = Math.max(0, u.owner.minions - 1);
  }
  /** Eraser Knight execute. */
  erase(t, src) {
    this.text(t.x, t.y - 80 * t.s, 'ERASED!', '#f472b6', 22, 0.9);
    for (let i = 0; i < 14; i++) this.part({ type: 'debris', x: t.x + U.rand(-10, 10), y: t.y - U.rand(10, 60) * t.s, vx: U.rand(-140, 140), vy: U.rand(-260, -60), g: 800, life: 0.8, size: U.rand(2, 5), color: i % 2 ? '#f9a8d4' : '#ffffff', rot: 0, vr: U.rand(-10, 10) });
    if (src.team === 0) this.stats.dmgDealt += Math.max(0, t.hp);
    t.erased = true;
    this.kill(t, src);
  }
  /** Rally Drummer aura. */
  rallyPulse(u) {
    const d = u.def;
    let n = 0;
    for (const o of this.team[u.team]) {
      if (!o.alive || o === u || o.def.structure || Math.abs(o.x - u.x) > d.aura.r) continue;
      o.buffT = Math.max(o.buffT, d.aura.dur); n++;
    }
    if (u.age % 1 < d.aura.every + 0.01 || n) {
      this.part({ type: 'note', x: u.x + U.rand(-6, 10), y: u.y - 50 * u.s, vx: U.rand(-20, 20), vy: -55, life: 1, size: 8, color: Math.random() < 0.5 ? '#fde047' : '#fb923c' });
      if (n) this.part({ type: 'ring', x: u.x, y: u.y - 4, life: 0.5, size: d.aura.r, color: '#fb923c', flat: true });
      if (n) this.sfx('drum', 0.95);
    }
  }
  dmgOf(u) { return u.dmg * (u.buffT > 0 ? BUFF.dmg : 1) * (u.radT > 0 ? 1.25 : 1) * (u.weakT > 0 ? u.weakF : 1); }
  /** Run a hook on every ability module of a unit; true if any module handled it. */
  callFx(u, name, a, b, c) {
    let r = false;
    for (const m of fxList(u)) if (m[name]) r = m[name](this, u, a, b, c) || r;
    return r;
  }
  /** Damage used by moves for units that normally deal none (healers, summoners). */
  movePower(u, mv) { return this.dmgOf(u) || (mv.power || 30) * (u.mult || 1); }
  moveMult(u) {
    return (u.slowT > 0 ? 0.5 : 1) * (u.buffT > 0 ? BUFF.march : 1) * (u.hasteT > 0 ? 1.3 : 1) * (u.weakT > 0 ? u.weakF : 1) * (u.gravT > 0 ? u.gravF : 1) * (this.wind ? this.windMult(u) : 1);
  }
  /** Timers for shields, buffs and debuffs; poison damage; Purity shimmer. */
  tickStatus(u, dt) {
    if (u.barrierT > 0) u.barrierT -= dt;
    if (u.shieldT > 0) { u.shieldT -= dt; if (u.shieldT <= 0) u.shieldHp = 0; }
    if (u.radT > 0) u.radT -= dt;
    if (u.roarT > 0) { u.roarT -= dt; if (Math.random() < dt * 6) this.part({ type: 'fire', x: u.x + U.rand(-8, 8), y: u.y - U.rand(10, 50) * u.s, vx: 0, vy: -50, life: 0.4, size: 3, color: '#f59e0b' }); }
    if (u.hasteT > 0) u.hasteT -= dt;
    if (u.weakT > 0) u.weakT -= dt;
    if (u.gravT > 0) u.gravT -= dt;
    if (u.poisonT > 0) {
      u.poisonT -= dt;
      const dmg = u.poisonDps * u.poisonStacks * dt;
      if (u.team === 1) this.stats.dmgDealt += Math.min(dmg, Math.max(0, u.hp));
      u.hp -= dmg;
      if (Math.random() < dt * (2 + u.poisonStacks)) this.part({ type: 'smoke', x: u.x + U.rand(-8, 8), y: u.y - U.rand(15, 55) * u.s, vx: U.rand(-10, 10), vy: -35, life: 0.6, size: 2.6, color: '#a855f7' });
      if (u.poisonT <= 0) u.poisonStacks = 0;
      if (u.hp <= 0) { this.text(u.x, u.y - 70 * u.s, 'VENOM!', '#c084fc', 16, 0.7); this.kill(u, { team: 1 - u.team }); return; }
    }
    if (u.def.rarity === 'P') {
      u.sparkT -= dt;
      if (u.sparkT <= 0) {
        u.sparkT = 0.12;
        this.part({ type: 'prism', x: u.x + U.rand(-16, 16) * u.s, y: u.y - U.rand(5, 70) * u.s, vx: 0, vy: -25, life: 0.9, size: U.rand(2, 4), hue: Math.random() * 360 });
      }
    }
  }

  // ---------- projectiles ----------
  launch(u, t, kind) {
    const sx = u.x + u.dir * 10 * u.s, sy = u.y - 40 * u.s;
    const tx0 = t.isBase ? t.front + u.dir * 10 : t.x;
    const ty = t.isBase ? BASE_GY - U.rand(60, 140) : t.y - 24 * t.s;
    const cfg = {
      arrow: { speed: 560, g: 650, min: 0.25, max: 0.75 },
      rock: { speed: 420, g: 900, min: 0.3, max: 0.85 },
      bomb: { speed: 330, g: 1100, min: 0.5, max: 1.0 },
      magic: { speed: 380, homing: true },
      hex: { speed: 330, homing: true },
      star: { speed: 430, homing: true },
    }[kind];
    const p = { kind, team: u.team, x: sx, y: sy, dmg: this.dmgOf(u), aoe: u.def.aoe || 0, target: t, src: { team: u.team, slow: u.def.slow, kbChance: u.def.kbChance, crit: u.def.crit, unit: u }, t: 0, done: false, rot: 0, trail: 0 };
    if (cfg.homing) {
      p.homing = true; p.speed = cfg.speed; p.tx = tx0; p.ty = ty;
    } else {
      const dist = Math.abs(tx0 - sx);
      const T = U.clamp(dist / cfg.speed, cfg.min, cfg.max);
      const lead = !t.isBase && t.state === 'walk' ? t.dir * t.speed * T * 0.8 : 0;
      const tx = tx0 + lead;
      p.T = T; p.g = cfg.g; p.vx = (tx - sx) / T; p.vy = (ty - sy - 0.5 * cfg.g * T * T) / T; p.tx = tx;
    }
    this.projs.push(p);
    return p;
  }
  /** Free-form projectile / zone: p.step(b,p,dt) moves it, p.drawFn(ctx,p,t) draws it, set p.done to finish. */
  addCustom(p) { p.custom = true; p.t = 0; p.done = false; this.projs.push(p); return p; }
  /** A projectile that flies straight along the lane and touches every foe it passes once. */
  launchLinear(u, kind, o) {
    const p = Object.assign({ kind, team: u.team, linear: true, x: u.x + u.dir * 14 * u.s, y: u.y - 38 * u.s, dir: u.dir, travelled: 0, hitIds: new Set(),
      t: 0, done: false, trail: 0, src: { team: u.team, unit: u }, baseHit: false }, o);
    this.projs.push(p);
    return p;
  }
  updateLinear(p, dt) {
    const step = p.speed * dt;
    p.x += p.dir * step; p.travelled += step;
    for (const o of this.team[1 - p.team]) {
      if (!o.alive || p.hitIds.has(o.id) || Math.abs(o.x - p.x) > 16 + 8 * o.s) continue;
      p.hitIds.add(o.id);
      p.onHit(this, p, o);
    }
    const base = p.team === 0 ? this.eBase : this.pBase;
    if (!p.baseHit && !base.destroyed && (p.x - base.front) * p.dir >= 0) {
      p.baseHit = true;
      if (p.onBase) p.onBase(this, p, base);
      p.done = true;
    }
    p.trail -= dt;
    if (p.trail <= 0 && p.trailFx) { p.trail = 0.03; p.trailFx(this, p); }
    if (p.travelled >= p.maxDist) p.done = true;
  }
  updateProj(p, dt) {
    if (p.done) return;
    p.t += dt;
    if (p.custom) { p.step(this, p, dt); return; }
    if (p.linear) { this.updateLinear(p, dt); return; }
    if (p.homing) {
      const tg = p.target;
      if (tg && (tg.isBase ? !tg.destroyed : tg.alive)) { p.tx = tg.isBase ? tg.front : tg.x; p.ty = tg.isBase ? p.ty : tg.y - 24 * tg.s; }
      const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy);
      if (dist < 10 || p.t > 3) { this.impact(p); return; }
      p.x += (dx / dist) * p.speed * dt;
      p.y += (dy / dist) * p.speed * dt + Math.sin(p.t * 18) * 0.6;
      p.trail -= dt;
      if (p.trail <= 0) {
        p.trail = 0.025;
        this.part({ type: 'spark', x: p.x, y: p.y, vx: U.rand(-20, 20), vy: U.rand(-20, 20), life: 0.35, size: 3, color: p.kind === 'magic' ? '#d8b4fe' : p.kind === 'star' ? '#93c5fd' : '#86efac' });
      }
    } else {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      p.rot = Math.atan2(p.vy, p.vx);
      if (p.kind === 'bomb') {
        p.trail -= dt;
        if (p.trail <= 0) { p.trail = 0.04; this.part({ type: 'smoke', x: p.x, y: p.y, vx: 0, vy: -10, life: 0.4, size: 3, color: '#9ca3af' }); }
      }
      if (p.t >= p.T) this.impact(p);
    }
  }
  impact(p) {
    p.done = true;
    const foes = this.team[1 - p.team];
    switch (p.kind) {
      case 'arrow': case 'rock': {
        let t = p.target;
        const ok = t && (t.isBase ? !t.destroyed : t.alive && Math.abs(t.x - p.x) < 40 * t.s);
        if (!ok) {
          t = null; let bd = 34;
          for (const o of foes) { const dd = Math.abs(o.x - p.x); if (o.alive && dd < bd) { bd = dd; t = o; } }
          const base = p.team === 0 ? this.eBase : this.pBase;
          if (!t && Math.abs(base.front - p.x) < 40) t = base;
        }
        if (t) {
          this.damage(t, p.dmg, p.src);
          this.sfx('hit', 0.05);
        } else if (p.kind === 'arrow') {
          this.part({ type: 'stuck', x: p.x, y: Math.min(p.y, GROUND_Y + LANE_H + 6), vx: 0, vy: 0, life: 1.6, size: 1, rot: p.rot });
        } else this.dust(p.x, GROUND_Y + 12, 2);
        break;
      }
      case 'bomb':
        this.areaBlast(p.x, p.dmg, p.aoe, p.team, p.src);
        break;
      case 'magic': {
        this.ring(p.x, p.y, '#c084fc', p.aoe);
        for (let i = 0; i < 12; i++) this.part({ type: 'star', x: p.x, y: p.y, vx: U.rand(-160, 160), vy: U.rand(-160, 100), life: 0.6, size: 4, color: '#e9d5ff' });
        for (const o of foes) if (o.alive && Math.abs(o.x - p.x) <= p.aoe) this.damage(o, p.dmg, p.src);
        const base = p.team === 0 ? this.eBase : this.pBase;
        if (Math.abs(base.front - p.x) <= p.aoe + 10) this.damage(base, p.dmg, p.src);
        this.sfx('hit', 0.05);
        break;
      }
      case 'star': {
        const t = p.target;
        if (t && (t.isBase ? !t.destroyed : t.alive)) this.damage(t, p.dmg, p.src);
        for (let i = 0; i < 6; i++) this.part({ type: 'star', x: p.x, y: p.y, vx: U.rand(-110, 110), vy: U.rand(-110, 70), life: 0.4, size: 3, color: '#bfdbfe' });
        this.sfx('hit', 0.05);
        break;
      }
      case 'hex': {
        const t = p.target;
        if (t && (t.isBase ? !t.destroyed : t.alive)) this.damage(t, p.dmg, p.src);
        for (let i = 0; i < 8; i++) this.part({ type: 'star', x: p.x, y: p.y, vx: U.rand(-120, 120), vy: U.rand(-120, 80), life: 0.5, size: 3, color: '#86efac' });
        break;
      }
    }
  }
  areaBlast(x, dmg, r, team, src) {
    const foes = this.team[1 - team];
    for (const o of foes) if (o.alive && Math.abs(o.x - x) <= r) this.damage(o, dmg, src);
    const base = team === 0 ? this.eBase : this.pBase;
    if (Math.abs(base.front - x) <= r + 15) this.damage(base, dmg, src);
    this.explosion(x, GROUND_Y + 4, r, false);
  }

  // ---------- effects ----------
  part(p) {
    if (this.parts.length > 650) return;
    p.t = 0; p.vx = p.vx || 0; p.vy = p.vy || 0; p.g = p.g || 0; p.rot = p.rot || 0; p.vr = p.vr || 0;
    this.parts.push(p);
  }
  text(x, y, s, color, size, life) {
    if (this.texts.length > 60) this.texts.shift();
    this.texts.push({ x: x + U.rand(-6, 6), y, s, color, size, life: life || 0.9, t: 0 });
  }
  spark(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = U.rand(80, 220);
      this.part({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: U.rand(0.15, 0.3), size: U.rand(2, 3.5), color: col });
    }
    this.part({ type: 'burst', x, y, life: 0.14, size: 10 });
  }
  slashFx(x, y, dir, s) { this.part({ type: 'slash', x, y, life: 0.16, size: 18 * s, rot: dir }); }
  ring(x, y, col, r) { this.part({ type: 'ring', x, y, life: 0.45, size: r, color: col }); }
  puff(x, y, col, n) {
    for (let i = 0; i < n; i++) this.part({ type: 'smoke', x: x + U.rand(-12, 12), y: y + U.rand(-16, 16), vx: U.rand(-50, 50), vy: U.rand(-50, 10), life: 0.5, size: U.rand(5, 9), color: col });
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) this.part({ type: 'smoke', x: x + U.rand(-8, 8), y: y - 2, vx: U.rand(-40, 40), vy: U.rand(-30, -5), life: 0.5, size: U.rand(3, 6), color: this.theme.pathDark });
  }
  shockwave(x, y, s) {
    this.part({ type: 'ring', x, y: y - 4, life: 0.4, size: 40 * s, color: '#ffffff', flat: true });
    for (let i = 0; i < 10; i++) this.part({ type: 'debris', x: x + U.rand(-30, 30) * s, y: y - 2, vx: U.rand(-160, 160), vy: U.rand(-320, -120), g: 1000, life: 0.7, size: U.rand(2, 4) * Math.sqrt(s), color: this.theme.pathDark, rot: 0, vr: U.rand(-10, 10) });
    this.dust(x, y, 8);
  }
  explosion(x, y, r, quiet) {
    this.part({ type: 'flash', x, y: y - r * 0.3, life: 0.3, size: r * 1.1, color: '#ffd27a' });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TAU, v = U.rand(60, 260);
      this.part({ type: 'fire', x, y: y - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: U.rand(0.3, 0.6), size: U.rand(6, 12), color: i % 2 ? '#ff9f1c' : '#ffd23f' });
    }
    for (let i = 0; i < 8; i++) this.part({ type: 'smoke', x: x + U.rand(-r / 2, r / 2), y: y - U.rand(10, 40), vx: U.rand(-40, 40), vy: U.rand(-80, -30), life: 1.1, size: U.rand(10, 18), color: '#555' });
    if (!quiet) { this.addShake(7); this.sfx('explode', 0.08); }
    else if (Math.random() < 0.4) this.sfx('explode', 0.2);
  }
  bolt(x, y) {
    const pts = [];
    let cx = x + U.rand(-40, 40), cy = -20;
    while (cy < y) { pts.push([cx, cy]); cy += U.rand(30, 60); cx += U.rand(-24, 24); if (cy >= y) pts.push([x, y]); }
    this.bolts.push({ pts, t: 0, life: 0.35 });
    this.part({ type: 'flash', x, y, life: 0.25, size: 50, color: '#fff7b0' });
    for (let i = 0; i < 8; i++) this.part({ type: 'spark', x, y, vx: U.rand(-200, 200), vy: U.rand(-260, -40), life: 0.4, size: 3, color: '#fff59d' });
  }
  /** A short lightning arc between two points. */
  arc(x1, y1, x2, y2, color) {
    const pts = [[x1, y1]], n = 5;
    for (let i = 1; i < n; i++) pts.push([U.lerp(x1, x2, i / n) + U.rand(-6, 6), U.lerp(y1, y2, i / n) + U.rand(-12, 12)]);
    pts.push([x2, y2]);
    this.bolts.push({ pts, t: 0, life: 0.25, color, thin: true });
  }
  updateParts(dt) {
    for (const p of this.parts) {
      p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += p.vr * dt;
      if (p.type === 'spark' || p.type === 'fire') { p.vx *= 0.92; p.vy *= 0.92; }
      if (p.type === 'smoke') { p.vx *= 0.96; p.vy *= 0.96; }
      if (p.type === 'debris' && p.y > GROUND_Y + LANE_H + 6) { p.y = GROUND_Y + LANE_H + 6; p.vy *= -0.3; p.vx *= 0.6; }
      if (p.type === 'coin' && p.t > p.life * 0.5) p.vy = Math.min(p.vy, 0);
    }
    if (this.parts.some(p => p.t >= p.life)) this.parts = this.parts.filter(p => p.t < p.life);
    for (const t of this.texts) t.t += dt;
    if (this.texts.length && this.texts[0].t >= this.texts[0].life) this.texts = this.texts.filter(t => t.t < t.life);
    for (const b of this.bolts) b.t += dt;
    if (this.bolts.length) this.bolts = this.bolts.filter(b => b.t < b.life);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.2);
    this.shake *= Math.exp(-dt * 9);
    if (this.shake < 0.3) this.shake = 0;
  }

  // ---------- rendering ----------
  render(ctx, res) {
    if (!this.scenery || this.scenery.res !== res) this.scenery = Scenery.build(this.L.theme, this.W, res);
    const sc = this.scenery, th = sc.th, t = this.t, dt = this.paused ? 0 : this.lastDt * this.speed;
    const sx = this.shake ? (Math.random() * 2 - 1) * this.shake : 0;
    const sy = this.shake ? (Math.random() * 2 - 1) * this.shake * 0.6 : 0;
    const cam = this.camX;

    Scenery.drawSky(ctx, th, t);
    ctx.save();
    ctx.translate(sx * 0.4, sy * 0.4);
    Scenery.drawClouds(ctx, this.clouds, th, cam, dt);
    Scenery.blit(ctx, sc.far, cam * PAR_FAR, FAR_Y);
    Scenery.blit(ctx, sc.mid, cam * PAR_MID, MID_Y);
    ctx.restore();

    ctx.save();
    ctx.translate(sx, sy);
    Scenery.blit(ctx, sc.ground, cam, GR_Y);
    ctx.translate(-cam, 0);

    Scenery.drawBase(ctx, this.pBase, t);
    Scenery.drawBase(ctx, this.eBase, t);
    if (this.gens) this.drawRulesUnder(ctx, t);

    // shadows
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    for (const u of this.units) {
      if (u.x < cam - 100 || u.x > cam + VIEW_W + 100) continue;
      const a = (u.alive ? 1 : Math.max(0, 1 - u.deadT / DEATH_DUR)) * (u.fly ? 0.6 : 1) * (u.phased ? 0.4 : 1);
      if (a <= 0 || u.burrowed) continue;
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.ellipse(u.x, u.y + 1 + (u.fly || 0), 12 * u.s * (u.fly ? 0.8 : 1), 3 * u.s, 0, 0, TAU); ctx.fill();
      if (u.alive && u.buffT > 0) {
        ctx.strokeStyle = 'rgba(251,146,60,.85)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(u.x, u.y + 1, 15 * u.s, 4 * u.s, 0, 0, TAU); ctx.stroke();
      }
      if (u.alive && u.radT > 0) {
        ctx.strokeStyle = 'rgba(251,191,36,.9)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(u.x, u.y + 1, 18 * u.s, 5 * u.s, 0, 0, TAU); ctx.stroke();
      }
      if (u.alive && u.frozenT > 0 && u.stunT > 0) {
        ctx.fillStyle = 'rgba(125,211,252,.35)';
        ctx.beginPath(); ctx.ellipse(u.x, u.y - 30 * u.s, 18 * u.s, 38 * u.s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.16)';
      }
    }
    ctx.globalAlpha = 1;
    // ground decals (stuck arrows, rings flat)
    for (const p of this.parts) if (p.type === 'stuck') this.drawPart(ctx, p);

    // ability effects behind units (fields, tethers)
    for (const u of this.units) if (u.alive) for (const m of fxList(u)) if (m.draw) m.draw(this, ctx, u, t, 'under');
    for (const p of this.projs) if (p.custom && p.under && p.drawFn) p.drawFn(ctx, p, t);
    // units sorted by depth
    const list = this.units.slice().sort((a, b) => a.y - b.y || (a.alive - b.alive));
    for (const u of list) {
      if (u.x < cam - 120 || u.x > cam + VIEW_W + 120) continue;
      if (u.burrowed) this.drawMound(ctx, u, t);
      else if (u.def.sprite === 'generator') this.drawGenerator(ctx, u, t);
      else if (u.def.structure) this.drawStructure(ctx, u, t);
      else if (u.def.sprite === 'fish') this.drawFishUnit(ctx, u, t);
      else Stick.drawUnit(ctx, u, t);
    }
    this.drawStatuses(ctx, list, cam, t);
    for (const u of this.units) if (u.alive) for (const m of fxList(u)) if (m.draw) m.draw(this, ctx, u, t, 'over');
    // health bars
    for (const u of list) {
      if (!u.alive || u.burrowed || u.hp >= u.maxHp || u === this.boss || u.x < cam - 50 || u.x > cam + VIEW_W + 50) continue;
      const w = 26 * Math.sqrt(u.s), y = u.y - 76 * u.s - (u.def.look.head && u.def.look.head.includes('wizhat') ? 14 : 0) - (u.def.sprite === 'generator' ? 50 : 0);
      ctx.fillStyle = 'rgba(30,20,15,.75)'; ctx.fillRect(u.x - w / 2 - 1, y - 1, w + 2, 5);
      ctx.fillStyle = u.team === 0 ? '#4ade80' : '#f87171';
      ctx.fillRect(u.x - w / 2, y, w * Math.max(0, u.hp / u.maxHp), 3);
    }
    // projectiles
    for (const p of this.projs) this.drawProj(ctx, p, t);
    // particles
    for (const p of this.parts) if (p.type !== 'stuck') this.drawPart(ctx, p);
    // lightning
    for (const b of this.bolts) {
      const a = 1 - b.t / b.life;
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.color || '#fff59d'; ctx.lineWidth = b.thin ? 5 : 10; ctx.lineJoin = 'miter';
      ctx.beginPath(); b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = b.thin ? 1.8 : 4; ctx.stroke();
      ctx.lineJoin = 'round';
    }
    ctx.globalAlpha = 1;
    if (this.wind || this.dark) this.drawRulesOver(ctx, t, cam, dt);
    // base hp labels in world
    for (const b of [this.pBase, this.eBase]) {
      if (b.invuln || b.destroyed) continue;
      const y = BASE_GY - (b.team === 0 ? 388 : 330);
      this.label(ctx, `${U.fmt(Math.max(0, b.hp))}/${U.fmt(b.maxHp)}`, b.x, y, 17, '#ffffff');
    }
    // floating texts
    for (const tx of this.texts) {
      const k = tx.t / tx.life;
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const pop = k < 0.15 ? U.easeOutBack(k / 0.15) : 1;
      this.label(ctx, tx.s, tx.x, tx.y - k * 36, tx.size * pop, tx.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    Scenery.drawWeather(ctx, this.weather, dt, t);
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(0.8, this.flash);
      ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }
  drawFishUnit(ctx, u, t) {
    const a = u.alive ? 1 : Math.max(0, 1 - u.deadT / 0.5);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a * (u.lifeLeft > 0 && u.lifeLeft < 2 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 10)) : 1);
    const bob = Math.sin(t * 4 + u.seed) * 4, lunge = u.state === 'attack' ? Math.sin(Math.min(1, u.atkT / u.animDur) * Math.PI) * 8 : 0;
    ZArt.drawFish(ctx, u.x + u.dir * lunge, u.y - 26 - bob, 7 * u.s, u.dir, t + u.seed, u.seed % 2 > 1 ? '#a5f3fc' : '#f0abfc');
    if (u.flash > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(u.x, u.y - 26 - bob, 9 * u.s, 6 * u.s, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  /** Shields, barriers, debuff marks and poison stacks drawn over units. */
  drawStatuses(ctx, list, cam, t) {
    for (const u of list) {
      if (!u.alive || u.x < cam - 60 || u.x > cam + VIEW_W + 60) continue;
      const s = u.s, cy = u.y - 32 * s;
      if (u.barrierT > 0) {
        const a = Math.min(1, u.barrierT / 0.5) * 0.9;
        ctx.globalAlpha = a * 0.18; ctx.fillStyle = '#bfdbfe';
        ctx.beginPath(); ctx.ellipse(u.x, cy, 24 * s, 40 * s, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = a; ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(u.x, cy, 24 * s, 40 * s, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(u.x + 2, cy - 44 * s, 3, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
      }
      if (u.shieldHp > 0) {
        ctx.globalAlpha = 0.55 + Math.sin(t * 6) * 0.15; ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; ctx.lineTo(u.x + Math.cos(a) * 21 * s, cy + Math.sin(a) * 34 * s); }
        ctx.stroke();
        ctx.globalAlpha = 0.12; ctx.fillStyle = '#86efac'; ctx.fill();
      }
      if (u.weakT > 0) {
        ctx.globalAlpha = 0.9;
        ZArt.drawGlyph(ctx, 'libra', u.x, u.y - 84 * s - 6, 16, '#d8b4fe', 9);
      }
      if (u.poisonT > 0 && u.poisonStacks > 0) {
        ctx.globalAlpha = 1;
        for (let i = 0; i < u.poisonStacks; i++) { ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(u.x - (u.poisonStacks - 1) * 3.5 + i * 7, u.y - 80 * s - 2, 2.6, 0, TAU); ctx.fill(); }
      }
    }
    ctx.globalAlpha = 1;
  }
  drawStructure(ctx, u, t) {
    const grow = U.easeOutBack(Math.min(1, u.age / 0.35));
    const a = u.alive ? (u.lifeLeft > 0 && u.lifeLeft < 3 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 8)) : 1) : Math.max(0, 1 - u.deadT / 0.5);
    if (a <= 0) return;
    const frac = u.hp / u.maxHp, s = u.s;
    ctx.save(); ctx.translate(u.x, u.y); ctx.scale(s, s * grow); ctx.globalAlpha = a;
    ctx.lineJoin = 'round'; ctx.strokeStyle = u.flash > 0 ? '#ff3030' : '#2b2118'; ctx.lineWidth = 2.2;
    const stakes = [[-22, 50, 0], [-11, 58, 0], [0, 54, 0], [11, 60, 0], [22, 52, 0]];
    stakes.forEach(([x, h], i) => {
      const tilt = frac < 0.5 && i === 3 ? 0.18 : frac < 0.25 && i === 1 ? -0.2 : 0;
      ctx.save(); ctx.translate(x, 0); ctx.rotate(tilt);
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-5, -h + 7); ctx.lineTo(0, -h); ctx.lineTo(5, -h + 7); ctx.lineTo(5, 0); ctx.closePath();
      ctx.fillStyle = i % 2 ? '#c08a4e' : '#d6a15c'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(43,33,24,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-2, -h + 12); ctx.stroke();
      ctx.strokeStyle = u.flash > 0 ? '#ff3030' : '#2b2118'; ctx.lineWidth = 2.2;
      ctx.restore();
    });
    for (const y of [-16, -38]) { ctx.fillStyle = '#a16207'; ctx.fillRect(-30, y - 4, 60, 8); ctx.strokeRect(-30, y - 4, 60, 8); }
    ctx.fillStyle = '#e5e7eb';
    for (const [x, y] of [[-24, -16], [24, -16], [-24, -38], [24, -38]]) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); }
    if (frac < 0.66) { ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-8, -22); ctx.lineTo(-12, -14); ctx.stroke(); }
    if (frac < 0.33) { ctx.beginPath(); ctx.moveTo(10, -50); ctx.lineTo(16, -40); ctx.lineTo(12, -30); ctx.stroke(); }
    ctx.restore();
  }
  label(ctx, s, x, y, size, col) {
    if (size < 1) return;
    ctx.font = `${Math.round(size)}px "Luckiest Guy", Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, size * 0.22); ctx.strokeStyle = '#2b2118'; ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  drawProj(ctx, p, t) {
    if (p.custom) { if (!p.under && p.drawFn) p.drawFn(ctx, p, t); return; }
    ctx.save(); ctx.translate(p.x, p.y);
    switch (p.kind) {
      case 'arrow':
        ctx.rotate(p.rot);
        ctx.strokeStyle = '#6b4220'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(6, -3.5); ctx.lineTo(6, 3.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#161616'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-18, -4); ctx.lineTo(-11, 0); ctx.lineTo(-18, 4); ctx.closePath(); ctx.fill();
        break;
      case 'rock':
        ctx.rotate(p.t * 12);
        ctx.fillStyle = '#8d8a85'; ctx.strokeStyle = '#161616'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(-3, -5); ctx.lineTo(3, -5); ctx.lineTo(5.5, 0); ctx.lineTo(2, 4.5); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 'bomb': {
        ctx.rotate(p.t * 8);
        ctx.fillStyle = '#26262b'; ctx.strokeStyle = '#161616'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(-2.5, -2.5, 2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(5, -10); ctx.stroke();
        ctx.fillStyle = Math.sin(t * 40) > 0 ? '#fde047' : '#fb923c'; ctx.beginPath(); ctx.arc(5, -10, 2.5, 0, TAU); ctx.fill();
        break;
      }
      case 'star': {
        ctx.rotate(p.t * 14);
        if (p.tint) ZArt.glow(ctx, 0, 0, 14, p.tint, 0.7);
        ctx.strokeStyle = p.tint || '#93c5fd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke();
        ZArt.star4(ctx, 0, 0, 4, '#eff6ff');
        break;
      }
      case 'pierce': {
        const big = p.enhanced, len = big ? 34 : 24, col = big ? '#fde047' : '#7dd3fc';
        ZArt.glow(ctx, 0, 0, big ? 22 : 12, col, 0.6);
        ctx.scale(p.dir, 1);
        ctx.strokeStyle = col; ctx.lineWidth = big ? 4 : 2.6; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len * 0.4, 0); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
        ZArt.star4(ctx, len * 0.5, 0, big ? 7 : 5, '#ffffff');
        break;
      }
      case 'quake': {
        ctx.scale(p.dir, 1);
        ZArt.glow(ctx, 0, -10, 40, p.color, 0.6);
        if (p.style === 'rock') {
          for (let i = 0; i < 5; i++) { const h = 30 - i * 5, x = -i * 13; ctx.fillStyle = i % 2 ? '#57534e' : '#78716c'; ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 7, 6); ctx.lineTo(x, 6 - h); ctx.lineTo(x + 7, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = p.color; ctx.beginPath(); ctx.moveTo(x - 2, 4 - h * 0.5); ctx.lineTo(x, 6 - h); ctx.stroke(); }
        } else if (p.style === 'water') {
          ctx.fillStyle = p.color; ctx.globalAlpha = 0.8;
          ctx.beginPath(); ctx.moveTo(-34, 8); ctx.quadraticCurveTo(-20, -14, 0, -34); ctx.quadraticCurveTo(16, -40, 18, -24); ctx.quadraticCurveTo(8, -26, 8, -14); ctx.quadraticCurveTo(10, 0, 14, 8); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        } else {
          ctx.strokeStyle = p.color; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-14, -10, 22, -1.1, 1.1); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        }
        break;
      }
      case 'wave': {
        ctx.scale(p.dir, 1);
        const h = 54, a = 0.85;
        ctx.globalAlpha = a;
        const g = ctx.createLinearGradient(0, -h, 0, 30);
        g.addColorStop(0, 'rgba(165,243,252,.95)'); g.addColorStop(1, 'rgba(8,145,178,.75)');
        ctx.beginPath(); ctx.moveTo(-46, 30); ctx.quadraticCurveTo(-30, -10, 0, -h + 8); ctx.quadraticCurveTo(22, -h - 6, 26, -h + 18);
        ctx.quadraticCurveTo(12, -h + 14, 10, -h + 26); ctx.quadraticCurveTo(14, 0, 18, 30); ctx.closePath();
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-6, -h + 10); ctx.quadraticCurveTo(14, -h - 2, 24, -h + 16); ctx.stroke();
        for (let i = 0; i < 4; i++) ZArt.star4(ctx, -30 + i * 12, -10 - (i % 2) * 14, 2.5, '#ecfeff');
        break;
      }
      case 'magic': case 'hex': {
        const col = p.kind === 'magic' ? ['#ffffff', '#d8b4fe', '#7c3aed'] : ['#ecfccb', '#86efac', '#15803d'];
        const r = p.kind === 'magic' ? 8 : 6;
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 2);
        g.addColorStop(0, col[0]); g.addColorStop(0.4, col[1]); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2, 0, TAU); ctx.fill();
        ctx.fillStyle = col[0]; ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, TAU); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
  drawPart(ctx, p) {
    const k = p.t / p.life, a = 1 - k;
    switch (p.type) {
      case 'spark':
        ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
        break;
      case 'burst': {
        ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
        const r = p.size * (0.6 + k);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const ang = (i / 8) * TAU, rr = i % 2 ? r * 0.4 : r; ctx.lineTo(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr); }
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'slash':
        ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5 * (1 - k) + 1;
        ctx.beginPath();
        if (p.rot > 0) ctx.arc(p.x - p.size * 0.4, p.y, p.size, -1.1, 1.0);
        else ctx.arc(p.x + p.size * 0.4, p.y, p.size, Math.PI - 1.0, Math.PI + 1.1);
        ctx.stroke();
        break;
      case 'ring':
        ctx.globalAlpha = a * 0.9; ctx.strokeStyle = p.color; ctx.lineWidth = 4 * a + 1;
        ctx.beginPath();
        if (p.flat) ctx.ellipse(p.x, p.y, p.size * (0.3 + k), p.size * (0.3 + k) * 0.25, 0, 0, TAU);
        else ctx.arc(p.x, p.y, p.size * (0.2 + U.easeOut(k) * 0.8), 0, TAU);
        ctx.stroke();
        break;
      case 'smoke':
        ctx.globalAlpha = a * 0.55; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k * 0.9), 0, TAU); ctx.fill();
        break;
      case 'fire':
        ctx.globalAlpha = a; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k * 0.6), 0, TAU); ctx.fill();
        break;
      case 'flash': {
        ctx.globalAlpha = a * 0.85;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (0.6 + k * 0.6));
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, p.color); g.addColorStop(1, 'rgba(255,120,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k * 0.6), 0, TAU); ctx.fill();
        break;
      }
      case 'debris':
        ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
        break;
      case 'star':
        ctx.globalAlpha = a; ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const ang = (i / 8) * TAU + p.t * 6, rr = i % 2 ? p.size * 0.4 : p.size; ctx.lineTo(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr); }
        ctx.closePath(); ctx.fill();
        break;
      case 'plus':
        ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.strokeStyle = '#14532d'; ctx.lineWidth = 1;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size * 1.5, p.size, p.size * 3); ctx.fillRect(p.x - p.size * 1.5, p.y - p.size / 2, p.size * 3, p.size);
        break;
      case 'coin':
        ctx.globalAlpha = a; ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * Math.abs(Math.cos(p.t * 10)) + 1, p.size, 0, 0, TAU); ctx.fill(); ctx.stroke();
        break;
      case 'ghost': {
        ctx.globalAlpha = a * 0.85;
        const x = p.x + Math.sin(p.t * 6) * 4, y = p.y;
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, p.size, Math.PI, 0); ctx.lineTo(x + p.size, y + p.size * 1.2);
        ctx.quadraticCurveTo(x + p.size * 0.5, y + p.size * 0.8, x, y + p.size * 1.3); ctx.quadraticCurveTo(x - p.size * 0.5, y + p.size * 0.8, x - p.size, y + p.size * 1.2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y - p.size - 3, p.size * 0.7, p.size * 0.22, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#374151'; ctx.fillRect(x - 3, y - 2, 1.6, 1.6); ctx.fillRect(x + 1.5, y - 2, 1.6, 1.6);
        break;
      }
      case 'prism': {
        ctx.globalAlpha = a; ctx.fillStyle = `hsl(${(p.hue + p.t * 240) % 360},95%,72%)`;
        const r = p.size * (1 - k * 0.4);
        ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 2); ctx.lineTo(p.x + r * 0.5, p.y); ctx.lineTo(p.x, p.y + r * 2); ctx.lineTo(p.x - r * 0.5, p.y); ctx.closePath(); ctx.fill();
        break;
      }
      case 'note': {
        ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 1.2;
        const x = p.x + Math.sin(p.t * 8) * 4;
        ctx.beginPath(); ctx.ellipse(x, p.y, 3.4, 2.6, -0.4, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 3, p.y - 1); ctx.lineTo(x + 3, p.y - 12); ctx.lineTo(x + 8, p.y - 9); ctx.stroke();
        break;
      }
      case 'clock': {
        const r = p.size * (0.5 + U.easeOut(Math.min(1, k * 3)) * 0.5);
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = 'rgba(186,230,253,.25)'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 4; ctx.stroke();
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(an) * r * 0.82, p.y + Math.sin(an) * r * 0.82); ctx.lineTo(p.x + Math.cos(an) * r * 0.95, p.y + Math.sin(an) * r * 0.95); ctx.stroke(); }
        const h1 = -Math.PI / 2 - p.t * 9, h2 = -Math.PI / 2 - p.t * 2;
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(h1) * r * 0.75, p.y + Math.sin(h1) * r * 0.75); ctx.stroke();
        ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(h2) * r * 0.5, p.y + Math.sin(h2) * r * 0.5); ctx.stroke();
        break;
      }
      case 'stuck':
        ctx.globalAlpha = Math.min(1, a * 3);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.strokeStyle = '#6b4220'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(2, 0); ctx.stroke();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-16, -3.5); ctx.lineTo(-9, 0); ctx.lineTo(-16, 3.5); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
    }
    ctx.globalAlpha = 1;
  }

  /** Minimap: a slim overview of the whole battlefield. */
  renderMinimap(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    const k = w / this.W;
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, h - 6, w, 6);
    ctx.fillStyle = '#4aa3ff'; ctx.fillRect(this.pBase.x * k - 4, 3, 8, h - 6);
    ctx.fillStyle = this.eBase.portal ? '#a855f7' : '#ef4444'; ctx.fillRect(this.eBase.x * k - 4, 3, 8, h - 6);
    for (const u of this.units) {
      if (!u.alive) continue;
      ctx.fillStyle = u.team === 0 ? '#8fd0ff' : u.def.boss ? '#ffd23f' : '#ff7b7b';
      const r = u.def.boss ? 4 : u.s > 1.3 ? 3 : 2;
      ctx.fillRect(u.x * k - r / 2, h / 2 - r / 2 + (u.lane - 0.5) * 8, r, r);
    }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.strokeRect(this.camX * k + 1, 1, VIEW_W * k - 2, h - 2);
  }
}
