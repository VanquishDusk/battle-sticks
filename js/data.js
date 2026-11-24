'use strict';
/* =========================================================
   Static game data: player units, enemies, levels, upgrades.
   Stats are for level-1 units; see Progress.unitMult().

   kb       = number of knockbacks the unit suffers over its whole
              life (the last one is its death). kb:1 = never
              flinches, kb:3 = knocked back at 66% and 33% hp.
   attack   = melee | area | arrow | bomb | magic | heal | rock |
              hex | explode
   anim     = attack animation (see Stick.ANIMS)
   hitAt    = when inside the animation the hit lands (defaults
              per animation)
   ========================================================= */

const UNITS = [
  {
    id: 'stick', name: 'Stickling', short: 'Stick', role: 'Basic',
    desc: 'Cheap, fast to deploy and surprisingly brave. Spam them to hold the line.',
    cost: 50, cd: 2.2, hp: 150, dmg: 15, rate: 1.0, range: 32, speed: 52, kb: 2,
    attack: 'melee', anim: 'slash', animDur: 0.42, color: '#3b82f6',
    look: { weapon: 'twig', head: ['cap'] }, unlock: 0, xp: 40,
  },
  {
    id: 'shield', name: 'Shieldbearer', short: 'Shield', role: 'Tank',
    desc: 'A walking wall. Takes 25% less damage and never flinches.',
    cost: 120, cd: 5, hp: 850, dmg: 9, rate: 1.5, range: 30, speed: 32, kb: 1, armor: 0.25,
    attack: 'melee', anim: 'bash', animDur: 0.5, scale: 1.08, color: '#64748b',
    look: { weapon: 'shield', head: ['helmet'] }, hold: { shF: 0.75, elF: 0.55 }, unlock: 0, xp: 55,
  },
  {
    id: 'boxer', name: 'Brawler', short: 'Boxer', role: 'Bruiser',
    desc: 'Hits like a truck at point-blank range. Punches can knock foes flying.',
    cost: 180, cd: 6, hp: 320, dmg: 55, rate: 0.85, range: 26, speed: 58, kb: 2, kbChance: 0.2,
    attack: 'melee', anim: 'punch', animDur: 0.36, color: '#ef4444',
    look: { weapon: 'gloves', head: ['headband'] }, unlock: 1, xp: 70,
  },
  {
    id: 'archer', name: 'Archer', short: 'Archer', role: 'Ranged',
    desc: 'Rains arrows from long range. Keep them safe behind the front line.',
    cost: 200, cd: 7, hp: 120, dmg: 32, rate: 1.7, range: 270, speed: 42, kb: 1,
    attack: 'arrow', anim: 'bow', animDur: 0.8, color: '#22c55e',
    look: { weapon: 'bow', head: ['hood'], back: 'quiver', hoodColor: '#2f9e4f' }, hold: { shF: 0.9, elF: 0.4 }, unlock: 2, xp: 80,
  },
  {
    id: 'ninja', name: 'Ninja', short: 'Ninja', role: 'Assassin',
    desc: 'Blindingly fast. Dodges 25% of attacks and lands critical hits.',
    cost: 160, cd: 5, hp: 170, dmg: 13, rate: 0.32, range: 34, speed: 125, kb: 2, dodge: 0.25, crit: 0.15,
    attack: 'melee', anim: 'ninja', animDur: 0.26, color: '#334155', run: 'run',
    look: { weapon: 'katana', head: ['ninjaband'], face: 'ninja', headFill: '#22262e' }, unlock: 3, xp: 80,
  },
  {
    id: 'bomber', name: 'Bomber', short: 'Bomber', role: 'Splash',
    desc: 'Lobs bombs that blast every enemy in the area. Crowds hate this guy.',
    cost: 280, cd: 10, hp: 170, dmg: 75, rate: 2.6, range: 200, speed: 40, kb: 1, aoe: 75,
    attack: 'bomb', anim: 'throw', animDur: 0.6, color: '#f97316',
    look: { weapon: 'bomb', head: ['goggles'], back: 'bombpack' }, unlock: 4, xp: 100,
  },
  {
    id: 'medic', name: 'Medic', short: 'Medic', role: 'Support',
    desc: 'Heals every nearby stickman in a pulse of light. Keeps tanks alive longer.',
    cost: 260, cd: 12, hp: 240, dmg: 0, heal: 45, healR: 170, rate: 2.2, range: 150, speed: 42, kb: 1,
    attack: 'heal', anim: 'heal', animDur: 0.6, color: '#f43f5e',
    look: { weapon: 'wand', head: ['medcap'], back: 'medbag' }, hold: { shF: 0.4, elF: 0.9 }, unlock: 5, xp: 110,
  },
  {
    id: 'wizard', name: 'Wizard', short: 'Wizard', role: 'Mage',
    desc: 'Hurls arcane orbs that splash nearby foes and slow them down.',
    cost: 380, cd: 12, hp: 190, dmg: 48, rate: 2.2, range: 240, speed: 36, kb: 1, aoe: 55, slow: 2.5,
    attack: 'magic', anim: 'staff', animDur: 0.7, color: '#8b5cf6',
    look: { weapon: 'staff', head: ['wizhat', 'beard'] }, hold: { shF: 0.4, elF: 0.9 }, unlock: 6, xp: 130,
  },
  {
    id: 'lancer', name: 'Lancer', short: 'Lancer', role: 'Piercer',
    desc: 'Long spear pierces through every enemy within reach.',
    cost: 240, cd: 8, hp: 360, dmg: 34, rate: 1.3, range: 80, speed: 46, kb: 2,
    attack: 'area', anim: 'stab', animDur: 0.45, color: '#eab308',
    look: { weapon: 'spear', head: ['plume'] }, hold: { shF: 0.25, elF: 0.1 }, unlock: 7, xp: 110,
  },
  {
    id: 'giant', name: 'Giant', short: 'Giant', role: 'Titan',
    desc: 'A colossal stickman. Massive health and earth-shaking area smashes.',
    cost: 1000, cd: 30, hp: 4200, dmg: 200, rate: 2.8, range: 70, speed: 22, kb: 3, kbChance: 0.5,
    attack: 'area', anim: 'slam', animDur: 1.0, scale: 2.3, shake: 8, heavy: true, color: '#a16207',
    look: { weapon: 'bigclub', head: ['horns'] }, unlock: 8, xp: 160,
  },
];
const UNIT_BY_ID = Object.fromEntries(UNITS.map(u => [u.id, u]));

const ENEMIES = {
  grunt: {
    id: 'grunt', name: 'Grunt', tier: 1,
    hp: 110, dmg: 11, rate: 1.1, range: 30, speed: 42, kb: 2, reward: 14,
    attack: 'melee', anim: 'slash', animDur: 0.45, look: { weapon: 'club', head: ['bandana'] },
  },
  runner: {
    id: 'runner', name: 'Runner', tier: 1,
    hp: 75, dmg: 9, rate: 0.6, range: 26, speed: 100, kb: 1, reward: 16, run: 'run',
    attack: 'melee', anim: 'punch', animDur: 0.3, look: { head: ['runband'] },
  },
  slinger: {
    id: 'slinger', name: 'Slinger', tier: 2,
    hp: 95, dmg: 20, rate: 2.0, range: 210, speed: 36, kb: 1, reward: 30,
    attack: 'rock', anim: 'throw', animDur: 0.6, look: { weapon: 'rock', head: ['hood'], hoodColor: '#7c5a3a' },
  },
  brute: {
    id: 'brute', name: 'Brute', tier: 3,
    hp: 480, dmg: 24, rate: 1.7, range: 36, speed: 26, kb: 2, reward: 45, scale: 1.4, heavy: true,
    attack: 'melee', anim: 'slam', animDur: 0.8, look: { weapon: 'club', head: ['spikehelm'] },
  },
  boomer: {
    id: 'boomer', name: 'Boomer', tier: 2,
    hp: 70, dmg: 110, rate: 1, range: 24, speed: 80, kb: 1, reward: 25, aoe: 70, run: 'run',
    attack: 'explode', anim: 'fuse', animDur: 0.4, look: { back: 'bigbomb', head: ['goggles'] },
  },
  hexer: {
    id: 'hexer', name: 'Hexer', tier: 2,
    hp: 160, dmg: 16, rate: 2.4, range: 180, speed: 34, kb: 1, reward: 45,
    healPulse: { amt: 22, r: 140, every: 5 },
    attack: 'hex', anim: 'staff', animDur: 0.65, look: { weapon: 'hexstaff', head: ['skullmask'], face: 'skull' }, hold: { shF: 0.4, elF: 0.9 },
  },
  knight: {
    id: 'knight', name: 'Dark Knight', tier: 3,
    hp: 620, dmg: 30, rate: 1.4, range: 36, speed: 30, kb: 2, reward: 70, armor: 0.3, scale: 1.2,
    attack: 'melee', anim: 'slash', animDur: 0.5, look: { weapon: 'sword', head: ['fullhelm'], face: 'visor', headFill: '#5b6270', off: 'kshield' },
  },
  warlord: {
    id: 'warlord', name: 'Warlord', boss: true, tier: 4,
    hp: 3500, dmg: 85, rate: 2.2, range: 62, speed: 22, kb: 3, kbChance: 0.35, reward: 400, scale: 2.1, shake: 7, heavy: true,
    attack: 'area', anim: 'slam', animDur: 1.0, look: { weapon: 'axe', head: ['crown'], cape: '#b91c1c' },
  },
  titan: {
    id: 'titan', name: 'Titan', boss: true, tier: 4,
    hp: 8000, dmg: 125, rate: 2.7, range: 68, speed: 17, kb: 3, kbChance: 0.4, reward: 800, scale: 2.7, shake: 10, heavy: true,
    attack: 'area', anim: 'slam', animDur: 1.1, look: { weapon: 'hammer', head: ['stonehelm'], headFill: '#4a4f57' },
  },
  shadow: {
    id: 'shadow', name: 'Shadow King', boss: true, tier: 4,
    hp: 14000, dmg: 105, rate: 2.0, range: 70, speed: 22, kb: 4, kbChance: 0.35, reward: 1500, scale: 2.4, shake: 8, heavy: true,
    summon: { type: 'grunt', n: 2, every: 13 },
    attack: 'area', anim: 'sweep', animDur: 0.8, look: { weapon: 'scythe', head: ['darkcrown'], cape: '#4c1d95', aura: true },
  },
};

const REGIONS = [
  { theme: 'meadow', name: 'Meadowlands' },
  { theme: 'desert', name: 'Sunscorch Desert' },
  { theme: 'snow', name: 'Frostpeak' },
  { theme: 'volcano', name: 'Ashen Wastes' },
];

/* Each level is turned into waves by Battle.buildWaves():
   wave i spawns round(start + growth*i) enemies from `pool`
   (heavier tiers become more likely in later waves). */
const LEVELS = [
  { n: 1, name: 'Doodle Meadow', theme: 'meadow', width: 1500, baseHp: 2400, mult: 1.0, waves: 5, start: 3, growth: 1.2, gap: 16, spacing: [1.7, 2.7],
    pool: { grunt: 1 }, xp: 250, unlock: 'boxer', map: [86, 478],
    desc: 'A quiet meadow... except for the grunts. Learn the ropes here!' },
  { n: 2, name: 'Pencil Hills', theme: 'meadow', width: 1600, baseHp: 3600, mult: 1.05, waves: 6, start: 4, growth: 1.44, gap: 15, spacing: [1.4, 2.4],
    pool: { grunt: 3, runner: 1.2 }, xp: 350, unlock: 'archer', map: [196, 392],
    desc: 'Runners are fast but fragile. Keep a wall of Sticklings up front.' },
  { n: 3, name: 'Sketchwood', theme: 'meadow', width: 1700, baseHp: 5000, mult: 1.12, waves: 7, start: 5, growth: 1.44, gap: 15, spacing: [1.3, 2.3],
    pool: { grunt: 3, runner: 1.5, brute: 0.8 }, boss: 'warlord', bossMult: 0.5, xp: 480, unlock: 'ninja', map: [272, 288],
    desc: 'Brutes lurk in the woods, and their Warlord is watching.' },
  { n: 4, name: 'Dusty Dunes', theme: 'desert', width: 1750, baseHp: 6500, mult: 1.2, waves: 7, start: 5, growth: 1.56, gap: 15, spacing: [1.2, 2.2],
    pool: { grunt: 3, runner: 1.5, brute: 0.8, slinger: 1.4 }, xp: 580, unlock: 'bomber', map: [388, 372],
    desc: 'Slingers throw rocks from afar. Push past them quickly!' },
  { n: 5, name: 'Scribble Canyon', theme: 'desert', width: 1800, baseHp: 8000, mult: 1.28, waves: 8, start: 5, growth: 1.56, gap: 15, spacing: [1.1, 2.1],
    pool: { grunt: 3, runner: 1.5, brute: 1, slinger: 1.4, boomer: 1 }, xp: 700, unlock: 'medic', map: [492, 470],
    desc: 'Boomers carry bombs on their backs. Don\'t let them reach your crowd.' },
  { n: 6, name: 'Pyramid Pass', theme: 'desert', width: 1900, baseHp: 10000, mult: 1.36, waves: 8, start: 5, growth: 1.13, gap: 15, spacing: [1.1, 2.0],
    pool: { grunt: 3, runner: 1.5, brute: 1, slinger: 1.4, boomer: 1, hexer: 0.9 }, boss: 'warlord', bossMult: 0.62, xp: 850, unlock: 'wizard', map: [588, 352],
    desc: 'Hexers heal their allies. The Warlord returns, stronger than ever.' },
  { n: 7, name: 'Frostline', theme: 'snow', width: 1900, baseHp: 12000, mult: 1.45, waves: 8, start: 5, growth: 1.13, gap: 15, spacing: [1.0, 2.0],
    pool: { grunt: 3, runner: 1.5, brute: 1, slinger: 1.3, boomer: 1, hexer: 0.8, knight: 0.7 }, xp: 950, unlock: 'lancer', map: [694, 262],
    desc: 'Dark Knights shrug off 30% of all damage. Bring heavy hitters.' },
  { n: 8, name: 'Blizzard Peak', theme: 'snow', width: 2000, baseHp: 14000, mult: 1.62, waves: 9, start: 5, growth: 1.21, gap: 15, spacing: [1.0, 1.9],
    pool: { grunt: 3, runner: 1.6, brute: 1.1, slinger: 1.3, boomer: 1.1, hexer: 0.9, knight: 0.9 }, xp: 1100, unlock: 'giant', map: [804, 344],
    desc: 'The storm hides huge armies. Survive and a Giant joins your cause.' },
  { n: 9, name: 'Glacier Keep', theme: 'snow', width: 2000, baseHp: 17000, mult: 1.75, waves: 9, start: 6, growth: 1.21, gap: 15, spacing: [1.0, 1.8],
    pool: { grunt: 3, runner: 1.6, brute: 1.1, slinger: 1.3, boomer: 1.1, hexer: 1, knight: 1 }, boss: 'titan', bossMult: 0.5, xp: 1300, map: [892, 452],
    desc: 'The ground trembles. A Titan guards the frozen keep.' },
  { n: 10, name: 'Ashen Road', theme: 'volcano', width: 2100, baseHp: 20000, mult: 1.88, waves: 10, start: 6, growth: 1.21, gap: 15, spacing: [0.9, 1.8],
    pool: { grunt: 3, runner: 1.8, brute: 1.2, slinger: 1.4, boomer: 1.2, hexer: 1, knight: 1.1 }, xp: 1500, map: [1012, 382],
    desc: 'Embers fall like rain on the road to the citadel.' },
  { n: 11, name: 'Magma Rift', theme: 'volcano', width: 2100, baseHp: 24000, mult: 2.0, waves: 10, start: 6, growth: 1.29, gap: 15, spacing: [0.9, 1.7],
    pool: { grunt: 3, runner: 1.8, brute: 1.3, slinger: 1.4, boomer: 1.3, hexer: 1.1, knight: 1.2 }, boss: 'warlord', bossMult: 0.9, xp: 1700, map: [1110, 290],
    desc: 'The Warlord makes his last stand over a sea of lava.' },
  { n: 12, name: 'Shadow Citadel', theme: 'volcano', width: 2200, baseHp: 30000, mult: 2.15, waves: 10, start: 7, growth: 1.29, gap: 15, spacing: [0.9, 1.7],
    pool: { grunt: 3, runner: 1.8, brute: 1.3, slinger: 1.4, boomer: 1.3, hexer: 1.2, knight: 1.3 }, boss: 'shadow', bossMult: 0.62, xp: 2500, map: [1200, 404],
    desc: 'The Shadow King awaits. End this war once and for all!' },
];

const ENDLESS = {
  n: 'E', name: 'Endless Arena', theme: 'night', width: 1800, endless: true, gap: 17, unlockAfter: 6,
  desc: 'Waves never stop and only get nastier. How long can your tower stand?',
};

/* Permanent upgrades bought with XP. */
const LAB = [
  { id: 'tower', name: 'Tower Walls', desc: '+15% tower health per level', max: 10, base: 120, step: 90, color: '#3b82f6',
    val: l => `${Math.round(2500 * (1 + 0.15 * l))} HP`, icon: 'tower' },
  { id: 'mine', name: 'Gold Mine', desc: '+8% gold income per level', max: 10, base: 150, step: 100, color: '#eab308',
    val: l => (l ? `+${8 * l}%` : 'none'), icon: 'coin' },
  { id: 'chest', name: 'War Chest', desc: '+75 starting gold per level', max: 6, base: 120, step: 120, color: '#f97316',
    val: l => `${100 + 75 * l} gold`, icon: 'chest' },
  { id: 'storm', name: 'Storm Power', desc: '+25% thunder damage per level', max: 8, base: 140, step: 110, color: '#8b5cf6',
    val: l => `${Math.round(160 * (1 + 0.25 * l))} dmg`, icon: 'bolt' },
  { id: 'battery', name: 'Storm Battery', desc: 'Thunder recharges 8% faster per level', max: 6, base: 160, step: 130, color: '#06b6d4',
    val: l => `${(32 * Math.pow(0.92, l)).toFixed(1)}s`, icon: 'battery' },
  { id: 'drill', name: 'Drill Sergeant', desc: '-5% unit cooldowns per level', max: 6, base: 180, step: 140, color: '#22c55e',
    val: l => (l ? `-${5 * l}%` : 'none'), icon: 'clock' },
  { id: 'bounty', name: 'Bounty Hunter', desc: '+10% gold from defeated enemies per level', max: 5, base: 130, step: 110, color: '#ef4444',
    val: l => (l ? `+${10 * l}%` : 'none'), icon: 'skull' },
];

const WALLET_MAX_LV = 8;
const Wallet = {
  rate: lv => 15 + 7 * (lv - 1),          // gold per second (before Gold Mine bonus)
  max: lv => 500 + 250 * (lv - 1),
  cost: lv => (lv >= WALLET_MAX_LV ? Infinity : 40 + 80 * lv),
};

const UNIT_MAX_LV = 10;
