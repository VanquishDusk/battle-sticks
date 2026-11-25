'use strict';
/* =========================================================
   Evolution. Every stickman (regular units and Stickfigures)
   evolves at level 10 into an Evo form with a new name, a
   visual makeover and stat buffs. Ultra Rare and Purity
   Stickfigures (incl. all Zodiacs) also learn a new attack:
   an Evo move implemented in abilities.js (EvoFX).
   Players can switch any evolved unit between its Normal and
   Evo form at any time.
   ========================================================= */

const EVO_LV = 10;

/* Evo moves: defaults per type (tuned per unit in EVO below). */
const EVO_MOVES = {
  nova: { every: 4, r: 120, mult: 1.6, kb: true },
  chain: { jumps: 3, frac: 0.5, range: 170 },
  meteor: { cd: 7, r: 90, mult: 3, kb: true },
  barrage: { every: 3, n: 4, frac: 0.45 },
  shockwave: { every: 3, mult: 1.3, dist: 300, speed: 420, kb: true },
  clone: { cd: 14, life: 12, hp: 0.5, dmg: 0.5, keepFx: true },
  orbit: { n: 3, r: 48, frac: 0.3, tick: 0.5, shape: 'orb' },
  blink: { cd: 8, mult: 2.5, range: 340 },
  rain: { cd: 8, r: 100, dur: 2, frac: 0.35, tick: 0.25 },
  sanctuary: { cd: 10, r: 120, dur: 5, heal: 0.04, frac: 0.3, tick: 0.5 },
  rebirth: { hp: 0.5 },
  fortify: { below: 0.4, shield: 0.6, barrier: 6 },
};
const moveText = m => ({
  nova: `${m.every > 1 ? `every ${m.every} attacks` : 'with every attack'}, unleashes a burst that hits all foes within ${m.r}px for ${m.mult}x damage${m.kb ? ' and knocks them back' : ''}.`,
  chain: `every hit arcs to ${m.jumps} more enemies for ${Math.round(m.frac * 100)}% damage${m.erase ? ', and arcs can erase weakened foes too' : ''}.`,
  meteor: `every ${m.cd}s calls down a strike on the enemy front: ${m.mult}x damage in a ${m.r}px blast${m.kb ? ' with knockback' : ''}.`,
  barrage: `${m.every > 1 ? `every ${m.every} attacks` : 'with every attack'}, fires ${m.n} homing projectiles at enemies in range.`,
  shockwave: `${m.every > 1 ? `every ${m.every} attacks` : 'with every attack'}, sends a ${m.dist}px shockwave along the ground that hits every enemy in its path.`,
  clone: `every ${m.cd}s, summons a spectral copy of itself (${Math.round(m.hp * 100)}% health, ${Math.round(m.dmg * 100)}% damage) for ${m.life}s.`,
  orbit: `${m.n} orbiting shards constantly damage every enemy that gets close.`,
  blink: `every ${m.cd}s, teleports to the deepest enemy within ${m.range}px and strikes it for ${m.mult}x damage.`,
  rain: `every ${m.cd}s, rains attacks over a ${m.r}px area for ${m.dur}s.`,
  sanctuary: `every ${m.cd}s, creates a ${m.r}px zone for ${m.dur}s that heals allies and hurts enemies inside it.`,
  rebirth: `once per battle, rises again with ${Math.round(m.hp * 100)}% health after falling.`,
  fortify: `the first time it drops below ${Math.round(m.below * 100)}% health, gains a shield worth ${Math.round(m.shield * 100)}% of its max HP and a ${m.barrier}s barrier.`,
}[m.type]);

/* name/short, stat multipliers (hp, dmg, heal), stat overrides, look overrides, aura colour, Evo move. */
const EVO = {
  // ----- regular units -----
  stick: { name: 'Stick Captain', short: 'Captain', hp: 1.35, dmg: 1.35, look: { weapon: 'sword', head: ['plume'], cape: '#2563eb' } },
  shield: { name: 'Bulwark', short: 'Bulwark', hp: 1.5, dmg: 1.2, stats: { armor: 0.35 }, look: { head: ['fullhelm'], face: 'visor', headFill: '#cbd5e1', cape: '#475569' } },
  boxer: { name: 'Champion', short: 'Champ', hp: 1.3, dmg: 1.4, stats: { kbChance: 0.3 }, look: { weapon: 'starfists', head: ['headband', 'crown'] } },
  archer: { name: 'Ranger Lord', short: 'Ranger', hp: 1.3, dmg: 1.35, stats: { range: 310 }, look: { weapon: 'starbow', hoodColor: '#14532d', cape: '#166534' } },
  ninja: { name: 'Shadow Master', short: 'Shadow', hp: 1.3, dmg: 1.35, stats: { dodge: 0.35 }, look: { face: 'void', headFill: '#1e1033', ink: '#2e1065', band: '#a855f7' }, aura: '#a855f7' },
  bomber: { name: 'Demolisher', short: 'Demo', hp: 1.3, dmg: 1.35, stats: { aoe: 95 }, look: { head: ['hardhat', 'goggles'], back: 'bigbomb' } },
  medic: { name: 'Archmedic', short: 'Archmed', hp: 1.3, heal: 1.4, stats: { healR: 210 }, look: { head: ['medcap', 'leafhalo'], cape: '#f43f5e' } },
  wizard: { name: 'Archmage', short: 'Archmage', hp: 1.3, dmg: 1.35, stats: { aoe: 70 }, look: { cape: '#4c1d95' }, aura: '#a78bfa' },
  lancer: { name: 'Dragoon', short: 'Dragoon', hp: 1.3, dmg: 1.35, stats: { range: 95 }, look: { head: ['crown'], cape: '#b45309', ink: '#78350f' } },
  giant: { name: 'Colossus', short: 'Colossus', hp: 1.4, dmg: 1.35, scale: 1.12, look: { head: ['horns', 'crown'], weapon: 'hammer', cape: '#7c2d12' } },
  // ----- Common -----
  h_scout: { name: 'Sketch Ranger', short: 'Ranger', look: { head: ['plume'], cape: '#15803d' } },
  h_pebble: { name: 'Boulder Hurler', short: 'Boulder', stats: { range: 200 }, look: { hoodColor: '#57534e', cape: '#78350f' } },
  h_bucket: { name: 'Cauldron Knight', short: 'Cauldron', stats: { armor: 0.3 }, look: { head: ['fullhelm'], face: 'visor', headFill: '#475569' } },
  // ----- Rare -----
  h_ember: { name: 'Inferno Fist', short: 'Inferno', look: { weapon: 'starfists' }, aura: '#f97316' },
  h_frost: { name: 'Blizzard Bow', short: 'Blizzard', stats: { slow: 2.5 }, look: { weapon: 'starbow', hoodColor: '#e0f2fe', cape: '#0369a1' } },
  h_lumber: { name: 'Timberlord', short: 'Timber', stats: { range: 58 }, look: { head: ['beard', 'horns'] } },
  // ----- Major Rare -----
  h_storm: { name: 'Tempest', short: 'Tempest', stats: { dodge: 0.45 }, look: { cape: '#1e3a8a' }, aura: '#60a5fa' },
  h_grove: { name: 'Elder Grove', short: 'Elder', stats: { healR: 250 }, look: { head: ['hood', 'beard', 'leafhalo'] } },
  h_fizz: { name: 'Kaboomer', short: 'Kaboomer', stats: { aoe: 130 }, look: { head: ['goggles', 'hardhat'], back: 'bigbomb' } },
  h_phantom: { name: 'Glitch Wraith', short: 'Wraith', stats: { dodge: 0.6 }, look: { cape: '#2e1065' }, aura: '#c026d3' },
  h_drummer: { name: 'War Maestro', short: 'Maestro', stats: { aura: { r: 220, every: 0.5, dur: 1.2 } }, look: { head: ['crown'], cape: '#b91c1c' } },
  h_architect: { name: 'Grand Architect', short: 'Grand', stats: { build: { hp: 2400, life: 26 } }, look: { head: ['hardhat'], cape: '#a16207' } },
  // ----- Ultra Rare -----
  h_ronin: { name: 'Ink Shogun', short: 'Shogun', look: { head: ['ninjaband', 'crown'] }, aura: '#94a3b8', move: { type: 'blink', name: 'Ink Step', color: '#111827' } },
  h_comet: { name: 'Starfall Sage', short: 'Starfall', look: { cape: '#1e3a8a' }, move: { type: 'meteor', name: 'Comet Fall', color: '#60a5fa' } },
  h_lantern: { name: 'Lantern Sovereign', short: 'Sovereign', look: { head: ['hood', 'crown'] }, move: { type: 'orbit', name: 'Lantern Swarm', color: '#fb923c', shape: 'lantern' } },
  h_tide: { name: 'Tidequeen', short: 'Tidequeen', look: { head: ['hood', 'crown'] }, move: { type: 'shockwave', name: 'Riptide Surge', color: '#22d3ee', style: 'water' } },
  h_inkwell: { name: 'Master Painter', short: 'Painter', look: { cape: '#1d4ed8' }, move: { type: 'barrage', name: 'Ink Splatter', color: '#1d4ed8', every: 1, n: 5, frac: 0.6, power: 40 } },
  h_chrono: { name: 'Lord of Hours', short: 'Hours', look: {}, aura: '#7dd3fc', move: { type: 'clone', name: 'Time Echo', color: '#7dd3fc' } },
  // ----- Purities -----
  h_sol: { name: 'Sol Invictus', short: 'Invictus', stats: { goldAura: 0.6 }, move: { type: 'nova', name: 'High Noon', color: '#fde047', every: 3, r: 150, mult: 2 },
    note: 'Eternal Noon grows to +60% gold income.' },
  h_thorn: { name: 'Worldthorn', short: 'Worldthorn', stats: { reflect: 0.6 }, move: { type: 'rebirth', name: 'Evergreen', color: '#4ade80', hp: 0.6 },
    note: 'Thorn Mirror grows to 60% reflected damage.' },
  h_eraser: { name: 'The Blank Page', short: 'Blank', stats: { execute: 0.3 }, move: { type: 'chain', name: 'Erase Chain', color: '#f472b6', erase: true },
    note: 'Clean Slate now erases foes below 30% health.' },
  // ----- Zodiacs (each learns a different move) -----
  h_aries: { name: 'Supernova Ram', short: 'Supernova', move: { type: 'nova', name: 'Supernova', color: '#f97316', every: 4, r: 110, mult: 1.8 } },
  h_taurus: { name: 'Celestial Bastion', short: 'Bastion', move: { type: 'fortify', name: 'Starforged Bastion', color: '#4ade80' } },
  h_gemini: { name: 'Binary Star', short: 'Binary', move: { type: 'clone', name: 'Third Star', color: '#fde047', keepFx: false, cd: 12 } },
  h_cancer: { name: 'Moonlit Citadel', short: 'Citadel', move: { type: 'orbit', name: 'Lunar Shards', color: '#e0f2fe', shape: 'moon' } },
  h_leo: { name: 'Solar Monarch', short: 'Monarch', move: { type: 'meteor', name: 'Solar Flare', color: '#fbbf24', cd: 6 } },
  h_virgo: { name: 'Astral Saint', short: 'Saint', move: { type: 'sanctuary', name: 'Celestial Garden', color: '#86efac', power: 30 } },
  h_libra: { name: 'Final Arbiter', short: 'Arbiter', move: { type: 'chain', name: 'Final Verdict', color: '#c084fc', jumps: 4 } },
  h_scorpio: { name: 'Abyssal Stinger', short: 'Abyssal', move: { type: 'blink', name: 'Void Step', color: '#7c3aed', cd: 7 } },
  h_sagittarius: { name: 'Galaxy Hunter', short: 'Galaxy', move: { type: 'rain', name: 'Starfall Volley', color: '#7dd3fc' } },
  h_capricorn: { name: 'Peak Eternal', short: 'Peak', move: { type: 'shockwave', name: 'Avalanche', color: '#5eead4', style: 'rock', every: 2 } },
  h_aquarius: { name: 'Cosmic Deluge', short: 'Deluge', move: { type: 'barrage', name: 'Tidal Orbs', color: '#22d3ee', every: 1, n: 5, frac: 1.2 } },
  h_pisces: { name: 'Dream Leviathan', short: 'Leviathan', move: { type: 'rebirth', name: 'Eternal Dream', color: '#f0abfc' } },
};

const Evo = (() => {
  const cache = {};
  const S = () => Save.d;
  const st = k => S()[k] || (S()[k] = {});
  const baseDef = id => HERO_BY_ID[id] || UNIT_BY_ID[id];
  const tierMult = def => (!def.hero ? 1.35 : { C: 1.3, R: 1.3, MR: 1.35, UR: 1.25, P: 1.25 }[def.rarity]);

  function build(def) {
    const e = EVO[def.id] || { name: def.name + ' Evo', short: def.short };
    const m = tierMult(def);
    const ev = Object.assign({}, def, e.stats || {});
    ev.hp = def.hp * (e.hp || m);
    ev.dmg = def.dmg * (e.dmg || m);
    if (def.heal) ev.heal = def.heal * (e.heal || m);
    ev.scale = (def.scale || 1) * (e.scale || 1.06);
    ev.name = e.name; ev.short = e.short || e.name;
    ev.evolved = true; ev.base = def; ev.evoNote = e.note || null;
    ev.evoMove = e.move ? Object.assign({}, EVO_MOVES[e.move.type], e.move) : null;
    if (ev.evoMove) ev.evoMove.desc = `${ev.evoMove.name}: ${moveText(ev.evoMove)}`;
    // ----- visual makeover -----
    const look = Object.assign({}, def.look, e.look || {});
    const rare = def.hero && (def.rarity === 'UR' || def.rarity === 'P');
    if (!look.cape && (!def.hero || def.rarity !== 'C')) look.cape = Stick.H.mixHex(e.aura || def.color || '#64748b', '#000000', 0.35);
    look.evoAura = def.rarity === 'P' ? 'prism' : e.aura || def.color || '#fbbf24';
    look.evoRank = rare ? 2 : 1;
    const under = ['evoAura'].concat(look.under || []);
    if (def.zodiac) under.push('signHalo');
    if (def.rarity === 'P') under.push('prismHalo');
    look.under = under;
    look.over = (look.over || []).concat(['evoCrest']);
    ev.look = look;
    return ev;
  }

  const level = id => (HERO_BY_ID[id] ? (S().heroes[id] ? S().heroes[id].lv : 0) : Progress.unitLv(id));
  const isEvolved = id => !!st('evolved')[id];
  const active = id => isEvolved(id) && st('evoForm')[id] !== false;

  return {
    LV: EVO_LV,
    def: id => cache[id] || (cache[id] = build(baseDef(id))),
    level,
    isEvolved,
    active,
    canEvolve: id => level(id) >= EVO_LV && !isEvolved(id),
    /** The definition the player currently uses for this unit (Normal or Evo). */
    formDef: id => (active(id) ? Evo.def(id) : baseDef(id)),
    evolve(id) {
      if (level(id) < EVO_LV) return false;
      st('evolved')[id] = true; st('evoForm')[id] = true;
      Meta.track('evolves');
      Meta.changed();
      return true;
    },
    setActive(id, on) { if (isEvolved(id)) { st('evoForm')[id] = !!on; Meta.changed(); } },
    /** Human-readable list of what evolving changes. */
    changes(id) {
      const b = baseDef(id), e = Evo.def(id), out = [];
      const pct = (a, c) => `+${Math.round((a / c - 1) * 100)}%`;
      out.push(`${pct(e.hp, b.hp)} health`);
      if (b.dmg) out.push(`${pct(e.dmg, b.dmg)} damage`);
      if (b.heal) out.push(`${pct(e.heal, b.heal)} healing`);
      for (const [k, label] of [['range', 'range'], ['aoe', 'blast radius'], ['healR', 'heal radius'], ['armor', 'armor'], ['dodge', 'dodge'], ['kbChance', 'knockback chance'], ['slow', 'slow duration']]) {
        if (e[k] != null && b[k] != null && e[k] !== b[k]) out.push(`${label} ${typeof b[k] === 'number' && b[k] < 1 ? Math.round(b[k] * 100) + '% → ' + Math.round(e[k] * 100) + '%' : b[k] + ' → ' + e[k]}`);
      }
      if (e.build && e.build !== b.build) out.push(`barricade ${b.build.hp} → ${e.build.hp} HP, lasts ${e.build.life}s`);
      if (e.aura && e.aura !== b.aura && b.aura) out.push(`War Beat radius ${b.aura.r} → ${e.aura.r}px`);
      if (e.evoNote) out.push(e.evoNote);
      return out;
    },
  };
})();

/* ---------- Evo visuals ---------- */
(() => {
  const { circ } = Stick.H, L = Stick.LAYER, HR = Stick.HR;
  const auraCol = (o, k) => (o.look.evoAura === 'prism' ? `hsl(${(o.t * 90 + k * 60) % 360},95%,65%)` : o.look.evoAura);
  L.evoAura = (ctx, J, o) => {
    const c0 = auraCol(o, 0);
    ctx.save();
    const g = ctx.createRadialGradient(0, -32, 4, 0, -32, 44);
    g.addColorStop(0, c0.startsWith('#') ? c0 + '66' : c0.replace('hsl', 'hsla').replace(')', ',.4)'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -32, 44, 0, TAU); ctx.fill();
    ctx.strokeStyle = c0; ctx.lineWidth = 1.6; ctx.globalAlpha = o.alpha * 0.85;
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = -o.t * 18;
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 4.2, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      const k = (o.t * 0.7 + i / 4) % 1, x = Math.sin(i * 2.3 + o.t) * 14;
      ctx.globalAlpha = o.alpha * (1 - k) * 0.9;
      ZArt.star4(ctx, x, -6 - k * 60, 2.2, auraCol(o, i));
    }
    ctx.restore();
  };
  L.evoCrest = (ctx, J, o) => {
    const x = J.c.x, y = J.c.y - HR - 12 + Math.sin(o.t * 3) * 1.5;
    const col = o.look.evoAura === 'prism' ? auraCol(o, 0) : '#fde047';
    ZArt.glow(ctx, x, y, 9, '#fde68a', 0.7);
    ZArt.star4(ctx, x, y, 4.4, col);
    circ(ctx, x, y, 1.2, '#ffffff');
    if (o.look.evoRank > 1) for (const s of [-1, 1]) ZArt.star4(ctx, x + s * 7, y + 2, 2.4, col);
  };
  L.signHalo = (ctx, J, o) => {
    if (!o.def.zodiac) return;
    const c = J.c;
    ZArt.glow(ctx, c.x, c.y, 22, '#fde68a', 0.45);
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(o.t * 0.3);
    ctx.strokeStyle = 'rgba(251,191,36,.9)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ZArt.star4(ctx, Math.cos(a) * 17, Math.sin(a) * 17, 1.4, '#fde68a'); }
    ctx.restore();
    ZArt.drawGlyph(ctx, o.def.zodiac, c.x - 13, c.y - 13, 11, '#fde68a', 10);
  };
  L.prismHalo = (ctx, J, o) => {
    const c = J.c;
    ctx.save(); ctx.translate(c.x, c.y);
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `hsl(${(i * 30 + o.t * 120) % 360},95%,65%)`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 15, (i / 12) * TAU + o.t, ((i + 0.8) / 12) * TAU + o.t); ctx.stroke();
    }
    ctx.restore();
  };
})();
