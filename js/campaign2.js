'use strict';
/* =========================================================
   Campaign 2: Beyond the Margin.
   New enemy traits (flying, shielded, burrowing, ethereal,
   plated, splitting), stage rules (gale winds, darkness,
   shield generators, army limit, budget) and four bosses.
   The mechanics live in gimmicks.js.
   ========================================================= */

/* ---------- new enemies ---------- */
Object.assign(ENEMIES, {
  skywing: {
    id: 'skywing', name: 'Skywing', tier: 2, fly: 78, raid: true,
    hp: 160, dmg: 14, rate: 1.2, range: 46, speed: 60, kb: 1, reward: 36,
    attack: 'melee', anim: 'slash', animDur: 0.4,
    look: { head: ['aviator'], back: 'wings', ink: '#1e3a5f', headFill: '#334155' },
  },
  phalanx: {
    id: 'phalanx', name: 'Phalanx', tier: 2, guard: 0.9,
    hp: 500, dmg: 18, rate: 1.5, range: 32, speed: 30, kb: 2, reward: 42,
    attack: 'melee', anim: 'stab', animDur: 0.45,
    look: { weapon: 'spear', over: ['pavise'], head: ['helmet'], headFill: '#3f3a46' },
  },
  tunneler: {
    id: 'tunneler', name: 'Tunneler', tier: 2, burrow: true, dig: 125,
    hp: 240, dmg: 20, rate: 1.0, range: 30, speed: 44, kb: 2, reward: 40,
    attack: 'melee', anim: 'slam', animDur: 0.5,
    look: { weapon: 'pickaxe', head: ['minerhelm'], ink: '#3b2a1a', headFill: '#4a3728' },
  },
  phantom: {
    id: 'phantom', name: 'Phantom', tier: 2, phase: { on: 2.6, off: 1.6 },
    hp: 300, dmg: 26, rate: 1.1, range: 30, speed: 50, kb: 1, reward: 38,
    attack: 'melee', anim: 'slash', animDur: 0.4,
    look: { face: 'ghost', body: ['ghostSheet'], ink: '#475569', headFill: '#e2e8f0' },
  },
  ironclad: {
    id: 'ironclad', name: 'Ironclad', tier: 2, plate: 24,
    hp: 560, dmg: 28, rate: 1.6, range: 36, speed: 26, kb: 2, reward: 60, scale: 1.25, heavy: true,
    attack: 'melee', anim: 'slam', animDur: 0.7,
    look: { weapon: 'wrench', head: ['rivethelm'], face: 'visor', body: ['ironPlate'], headFill: '#6b7280' },
  },
  blot: {
    id: 'blot', name: 'Void Blot', tier: 2, split: { into: 'blotling', n: 2 },
    hp: 300, dmg: 18, rate: 1.2, range: 30, speed: 34, kb: 1, reward: 26, scale: 1.2,
    attack: 'melee', anim: 'punch', animDur: 0.4,
    look: { face: 'blot', body: ['inkDrip'], ink: '#0b0618', headFill: '#1e1b2e' },
  },
  blotling: {
    id: 'blotling', name: 'Blotling', tier: 1, spawnOnly: true, split: { into: 'blotmite', n: 2 },
    hp: 130, dmg: 11, rate: 1.0, range: 26, speed: 50, kb: 1, reward: 10, scale: 0.85,
    attack: 'melee', anim: 'punch', animDur: 0.35,
    look: { face: 'blot', body: ['inkDrip'], ink: '#0b0618', headFill: '#2e1065' },
  },
  blotmite: {
    id: 'blotmite', name: 'Blotmite', tier: 1, spawnOnly: true,
    hp: 55, dmg: 7, rate: 0.8, range: 24, speed: 72, kb: 1, reward: 4, scale: 0.62, run: 'run',
    attack: 'melee', anim: 'punch', animDur: 0.3,
    look: { face: 'blot', ink: '#0b0618', headFill: '#4c1d95' },
  },
  generator: {
    id: 'generator', name: 'Shield Generator', tier: 1, spawnOnly: true, structure: true, sprite: 'generator', fx: 'generator',
    hp: 2600, dmg: 0, rate: 1, range: 0, speed: 0, kb: 1, reward: 150, attack: 'none', look: {},
  },
  // ----- bosses -----
  roc: {
    id: 'roc', name: 'Storm Roc', boss: true, tier: 4, fly: 96, fx: 'roc',
    hp: 6500, dmg: 80, rate: 2.0, range: 64, speed: 26, kb: 3, kbChance: 0.35, reward: 800, scale: 2.0,
    attack: 'area', anim: 'slam', animDur: 0.8,
    look: { head: ['beak', 'crest'], back: 'bigwings', ink: '#1e293b', headFill: '#e2e8f0', cape: '#0f766e' },
  },
  wraith: {
    id: 'wraith', name: 'Wraith Queen', boss: true, tier: 4, phase: { on: 3.0, off: 2.6 },
    hp: 9000, dmg: 85, rate: 1.9, range: 68, speed: 22, kb: 3, kbChance: 0.3, reward: 1000, scale: 2.2,
    summon: { type: 'phantom', n: 2, every: 12 },
    attack: 'area', anim: 'sweep', animDur: 0.8,
    look: { weapon: 'scythe', face: 'ghost', head: ['wraithcrown'], body: ['ghostSheet'], ink: '#334155', headFill: '#f1f5f9', aura: '#a5f3fc' },
  },
  tyrant: {
    id: 'tyrant', name: 'Iron Tyrant', boss: true, tier: 4, plate: 32, fx: 'tyrant',
    hp: 11000, dmg: 110, rate: 2.4, range: 66, speed: 17, kb: 3, kbChance: 0.4, reward: 1200, scale: 2.5, shake: 9, heavy: true,
    attack: 'area', anim: 'slam', animDur: 1.0,
    look: { weapon: 'hammer', head: ['gearcrown'], face: 'visor', body: ['ironPlate'], back: 'smokestack', headFill: '#4b5563' },
  },
  theblot: {
    id: 'theblot', name: 'The Blot', boss: true, tier: 4, fx: 'bigblot', split: { into: 'blotling', n: 6 },
    hp: 20000, dmg: 100, rate: 2.1, range: 70, speed: 20, kb: 4, kbChance: 0.35, reward: 2000, scale: 2.6, shake: 8, heavy: true,
    attack: 'area', anim: 'slam', animDur: 0.9,
    look: { face: 'blot', head: ['darkcrown'], body: ['inkDrip'], ink: '#05010d', headFill: '#1e1b2e', aura: '#7c3aed', cape: '#2e1065' },
  },
});

/* ---------- campaigns ---------- */
REGIONS.forEach(r => (r.campaign = 1));
REGIONS.push(
  { theme: 'storm', name: 'Stormcoast', campaign: 2 },
  { theme: 'gloom', name: 'Gloomwood', campaign: 2 },
  { theme: 'foundry', name: 'Ironworks', campaign: 2 },
  { theme: 'rift', name: 'The Rift', campaign: 2 },
);

const CAMPAIGNS = [
  { id: 1, name: 'The Stick Wars', first: 1, last: 12, color: '#36b456' },
  { id: 2, name: 'Beyond the Margin', first: 13, last: 24, color: '#7c3aed', unlockAfter: 12,
    desc: 'The Shadow King\'s fall tore the page. New foes pour in from the margins, and every battle has a twist.' },
];
const C2 = (k, o) => Object.assign({ n: 12 + k, c: 2, label: `2-${k}`, gap: 15 }, o);

LEVELS.forEach(L => { L.c = 1; L.label = String(L.n); });
LEVELS.push(
  C2(1, { name: 'Gull Rock', theme: 'storm', width: 1900, baseHp: 26000, mult: 2.0, waves: 8, start: 5, growth: 1.15, spacing: [1.0, 1.9],
    pool: { grunt: 3, runner: 1.4, skywing: 2.2 }, xp: 2600, map: [92, 432],
    desc: 'Skywings ride the sea wind straight over your army to raid your tower. Ground troops can\'t reach them!',
    tip: 'Bring ranged units: Archers, Bombers and Wizards shoot flyers down. Lancers can spear them too.' }),
  C2(2, { name: 'Gale Cliffs', theme: 'storm', width: 2000, baseHp: 30000, mult: 2.1, waves: 9, start: 5, growth: 1.2, spacing: [1.0, 1.9],
    pool: { grunt: 3, slinger: 1.1, skywing: 1.6, phalanx: 1.5 }, xp: 2800, map: [196, 336], rules: { wind: { every: 15, dur: 5.5 } },
    desc: 'Gusts howl across the cliffs, and Phalanx shields turn arrows aside.',
    tip: 'Summon right before a tailwind. Phalanxes block ranged attacks, so mix melee in with your anti-air.' }),
  C2(3, { name: 'Stormbreak Point', theme: 'storm', width: 2000, baseHp: 34000, mult: 2.2, waves: 9, start: 6, growth: 1.2, spacing: [1.0, 1.8],
    pool: { grunt: 3, runner: 1.2, skywing: 1.7, phalanx: 1.3, brute: 0.8 }, boss: 'roc', bossMult: 0.6, xp: 3000, map: [288, 448], rules: { wind: { every: 14, dur: 5.5 } },
    desc: 'The Storm Roc nests on the point. It never lands, and its wings knock armies flat.',
    tip: 'Only anti-air can hurt the Roc. Keep several ranged units alive behind a sturdy wall.' }),

  C2(4, { name: 'Lantern Path', theme: 'gloom', width: 1900, baseHp: 34000, mult: 2.25, waves: 9, start: 6, growth: 1.2, spacing: [1.0, 1.8],
    pool: { grunt: 3, brute: 1.0, hexer: 0.8, tunneler: 1.6 }, xp: 3100, map: [396, 308], rules: { dark: { light: 115 } },
    desc: 'Gloomwood is pitch black. Your stickmen can only fight what they can see.',
    tip: 'Ranged units can only shoot lit enemies. Light-bearers (Wizard, Lantern, Sol, Leo) see farther, and Thunder lights the whole wood.' }),
  C2(5, { name: 'Hollow Graves', theme: 'gloom', width: 2000, baseHp: 38000, mult: 2.35, waves: 9, start: 6, growth: 1.25, spacing: [0.95, 1.8],
    pool: { grunt: 3, phantom: 2.4, tunneler: 1.0, hexer: 0.8 }, xp: 3300, map: [486, 420], rules: { dark: { light: 115 } },
    desc: 'Phantoms drift between the graves, fading in and out of the world.',
    tip: 'Most of your hits whiff while a Phantom is faded. Magic (Wizards, Comet, Tide, Libra...) hits them at any time.' }),
  C2(6, { name: 'Witchlight Hollow', theme: 'gloom', width: 2000, baseHp: 42000, mult: 2.45, waves: 10, start: 6, growth: 1.25, spacing: [0.95, 1.7],
    pool: { grunt: 3, phantom: 1.6, tunneler: 1.1, brute: 1.0, knight: 0.6 }, boss: 'wraith', bossMult: 0.6, xp: 3500, map: [594, 318], rules: { dark: { light: 115 } },
    desc: 'The Wraith Queen rules the hollow, calling Phantoms from the dark.',
    tip: 'The Queen fades like her Phantoms. Bring magic and light, and save Thunder for when she is solid.' }),

  C2(7, { name: 'Rivet Row', theme: 'foundry', width: 1900, baseHp: 42000, mult: 2.5, waves: 9, start: 6, growth: 1.25, spacing: [0.95, 1.8],
    pool: { grunt: 3, ironclad: 2.6, boomer: 1.0, slinger: 1.0 }, xp: 3600, map: [700, 446],
    desc: 'Ironclads march out of the foundry in riveted plate.',
    tip: 'Plating soaks the first chunk of every hit, so weak, fast hits barely scratch it. Heavy hitters and crits punch through.' }),
  C2(8, { name: 'Gearworks', theme: 'foundry', width: 2100, baseHp: 40000, mult: 2.6, waves: 10, start: 6, growth: 1.25, spacing: [0.95, 1.7],
    pool: { grunt: 3, ironclad: 1.4, phalanx: 1.0, skywing: 1.1, boomer: 0.8 }, xp: 3800, map: [800, 334], rules: { generators: [0.6, 0.78] },
    desc: 'Two shield generators power a barrier around the fortress.',
    tip: 'The fortress can\'t be damaged until both generators fall. Push hard to reach them.' }),
  C2(9, { name: 'Furnace Heart', theme: 'foundry', width: 2100, baseHp: 48000, mult: 2.7, waves: 10, start: 6, growth: 1.3, spacing: [0.9, 1.7],
    pool: { grunt: 3, ironclad: 1.5, phalanx: 1.0, knight: 0.8, boomer: 1.0 }, boss: 'tyrant', bossMult: 0.55, xp: 4000, map: [902, 436], rules: { generators: [0.62, 0.8] },
    desc: 'The Iron Tyrant guards the furnace, shelling your army from afar.',
    tip: 'Watch for red target marks: the Tyrant\'s cannon is coming. Heavy hitters crack its thick plating.' }),

  C2(10, { name: 'Torn Page', theme: 'rift', width: 2000, baseHp: 46000, mult: 2.75, waves: 10, start: 7, growth: 1.25, spacing: [0.9, 1.7],
    pool: { blot: 2.2, runner: 1.4, skywing: 1.0, phantom: 0.8 }, xp: 4100, map: [1010, 306], rules: { unitCap: 8 },
    desc: 'The page is torn. Only 8 of your stickmen fit through the rift at once.',
    tip: 'Blots split when they die, so area attacks shine. With only 8 slots on the field, bring your strongest units.' }),
  C2(11, { name: 'Margin of Error', theme: 'rift', width: 2100, baseHp: 50000, mult: 2.8, waves: 10, start: 7, growth: 1.3, spacing: [0.9, 1.6],
    pool: { grunt: 2, blot: 1.3, ironclad: 1.0, skywing: 1.1, phalanx: 1.0, phantom: 1.0, tunneler: 0.5 }, xp: 4300, map: [1108, 418], rules: { costCap: 400 },
    desc: 'The rift is too narrow for big units. Nothing costing over 400 can come through.',
    tip: 'Every trait at once, on a budget. Build a deck of cheap units that still covers flyers, shields and ghosts.' }),
  C2(12, { name: 'The Blot', theme: 'rift', width: 2200, baseHp: 60000, mult: 2.95, waves: 10, start: 7, growth: 1.3, spacing: [0.9, 1.6],
    pool: { blot: 1.6, skywing: 1.2, phantom: 1.0, ironclad: 1.0, phalanx: 0.9, tunneler: 0.8, knight: 0.7 }, boss: 'theblot', bossMult: 0.5, xp: 5000, map: [1204, 302],
    desc: 'At the heart of the rift waits The Blot, the ink stain that wants to swallow every page.',
    tip: 'The Blot divides as it weakens and bursts into Blotlings when it falls. Keep area damage ready for the end.' }),
);

/* ---------- briefings ---------- */
/* Enemy traits shown on level cards and the enemy guide. */
const TRAIT_INFO = {
  fly: { name: 'Flying', icon: '✈', color: '#38bdf8', text: 'Flies over your army to attack your tower. Only ranged units (range 120+) and Lancers can hit it.' },
  guard: { name: 'Shielded', icon: '⛨', color: '#a16207', text: 'Its tower shield blocks 90% of damage from ranged units. Melee hits it normally.' },
  burrow: { name: 'Burrower', icon: '⛏', color: '#92400e', text: 'Tunnels under your army and pops up behind it. Untouchable while underground, except by Thunder.' },
  phase: { name: 'Ethereal', icon: '☁', color: '#94a3b8', text: 'Fades out for a few seconds at a time, and physical hits pass right through it while faded. Magic always hits.' },
  plate: { name: 'Plated', icon: '⚙', color: '#64748b', text: 'Plating soaks the first part of every hit. Heavy hitters, crits, poison and Thunder get through.' },
  split: { name: 'Splitter', icon: '✵', color: '#7c3aed', text: 'Splits into smaller copies when defeated. Area damage clears them fast.' },
};
/* Stage rules. */
const RULE_INFO = {
  wind: { name: 'Gale Winds', icon: '\u{1F32C}', color: '#0ea5e9', text: L => `Every ${L.rules.wind.every}s a gust blows for ${L.rules.wind.dur}s, alternating direction. Tailwinds speed your army; headwinds stall it and speed up the enemy.` },
  dark: { name: 'Darkness', icon: '\u{1F311}', color: '#4c1d95', text: () => 'Your stickmen only fight enemies inside the light around them. Wizards, Lantern, Sol and Leo shine brighter. Thunder lights the whole field for a few seconds.' },
  generators: { name: 'Shield Generators', icon: '⚡', color: '#eab308', text: L => `The fortress is invulnerable while its ${L.rules.generators.length} generators stand.` },
  unitCap: { name: 'Army Limit', icon: '\u{1F465}', color: '#dc2626', text: L => `Only ${L.rules.unitCap} of your stickmen can be on the field at once (summoned helpers don't count).` },
  costCap: { name: 'Budget', icon: '\u{1F4B0}', color: '#ca8a04', text: L => `Units costing more than ${L.rules.costCap} can't be summoned. Swap in cheaper units before the battle.` },
};
/* How far each unit lights up the dark (added to the base light radius). */
const LIGHT = { wizard: 70, h_lantern: 230, h_sol: 210, h_leo: 130, h_comet: 90, h_cancer: 80, h_ember: 90, h_virgo: 60, h_tide: 50, h_grove: 40, h_chrono: 50 };
/* Units that can hit flyers although they fight up close, and units whose hits count as magic. */
const ANTI_AIR = { lancer: true, h_lumber: false };
const MAGIC_UNITS = { h_phantom: true, h_lantern: true, h_virgo: true, h_eraser: true };
