'use strict';
/* =========================================================
   Premium currency (Stick Tokens), banners, unique
   Stickfigures, daily rewards, quests and achievements.

   HEROES is the summonable roster. Every entry uses the same
   shape as a regular unit in data.js (so it can fight in
   battle) plus `rarity`, `ability` and optionally `limited`
   (= only obtainable from that banner).
   NOTE: the current entries are a starter set; replace or
   extend them freely: banners, rates and the collection all
   read from this table.
   ========================================================= */

const RARITIES = [
  { id: 'C', name: 'Common', color: '#9aa3af', glow: '#e5e7eb', rate: 50, shards: 5, upBase: 6, stars: 1 },
  { id: 'R', name: 'Rare', color: '#22c55e', glow: '#86efac', rate: 30, shards: 12, upBase: 10, stars: 2 },
  { id: 'SR', name: 'Super Rare', color: '#3b82f6', glow: '#93c5fd', rate: 14, shards: 30, upBase: 18, stars: 3 },
  { id: 'E', name: 'Epic', color: '#a855f7', glow: '#d8b4fe', rate: 5, shards: 80, upBase: 30, stars: 4 },
  { id: 'L', name: 'Legendary', color: '#f5b301', glow: '#fde68a', rate: 1, shards: 200, upBase: 50, stars: 5 },
];
const RARITY = Object.fromEntries(RARITIES.map((r, i) => [r.id, Object.assign({ idx: i }, r)]));

const HERO_MAX_LV = 10;

const HEROES = [
  // ----- Common -----
  { id: 'h_scout', rarity: 'C', name: 'Doodle Scout', short: 'Scout', role: 'Skirmisher',
    desc: 'A sketchbook runaway who sprints into battle ahead of everyone.', ability: 'Swift Feet: moves 40% faster than a Stickling.',
    cost: 60, cd: 2.4, hp: 170, dmg: 16, rate: 0.9, range: 32, speed: 72, kb: 2,
    attack: 'melee', anim: 'slash', animDur: 0.4, color: '#16a34a', look: { weapon: 'twig', head: ['cap'] } },
  { id: 'h_pebble', rarity: 'C', name: 'Pebble Pitcher', short: 'Pitcher', role: 'Ranged',
    desc: 'Never leaves home without a pocket full of perfectly round pebbles.', ability: 'Lob Shot: cheap long-range rock throws.',
    cost: 110, cd: 5, hp: 120, dmg: 22, rate: 1.5, range: 180, speed: 42, kb: 1,
    attack: 'rock', anim: 'throw', animDur: 0.55, color: '#a16207', look: { weapon: 'rock', head: ['hood'], hoodColor: '#a16207' } },
  { id: 'h_bucket', rarity: 'C', name: 'Bucket Knight', short: 'Bucket', role: 'Tank',
    desc: 'His helmet used to be a mop bucket. His courage is the real deal.', ability: 'Tin Plating: takes 20% less damage.',
    cost: 100, cd: 4.5, hp: 680, dmg: 9, rate: 1.4, range: 30, speed: 34, kb: 1, armor: 0.2,
    attack: 'melee', anim: 'bash', animDur: 0.5, scale: 1.05, color: '#0ea5e9', hold: { shF: 0.75, elF: 0.55 },
    look: { weapon: 'shield', head: ['helmet'] } },
  // ----- Rare -----
  { id: 'h_ember', rarity: 'R', name: 'Ember Fist', short: 'Ember', role: 'Bruiser',
    desc: 'Trained by punching campfires until they gave up.', ability: 'Blazing Jab: 35% chance to knock enemies back.',
    cost: 200, cd: 6, hp: 380, dmg: 62, rate: 0.8, range: 26, speed: 60, kb: 2, kbChance: 0.35,
    attack: 'melee', anim: 'punch', animDur: 0.34, color: '#f97316', look: { weapon: 'gloves', head: ['headband'], band: '#f97316', ink: '#3b1406' } },
  { id: 'h_frost', rarity: 'R', name: 'Frostbow', short: 'Frostbow', role: 'Ranged',
    desc: 'Her arrows are carved from glacier ice and never melt.', ability: 'Chill Arrow: hits slow enemies for 1.5s.',
    cost: 220, cd: 7, hp: 135, dmg: 30, rate: 1.6, range: 280, speed: 42, kb: 1, slow: 1.5,
    attack: 'arrow', anim: 'bow', animDur: 0.75, color: '#38bdf8', hold: { shF: 0.9, elF: 0.4 },
    look: { weapon: 'bow', head: ['hood'], back: 'quiver', hoodColor: '#7dd3fc', ink: '#0c4a6e' } },
  { id: 'h_lumber', rarity: 'R', name: 'Lumberstick', short: 'Lumber', role: 'Cleaver',
    desc: 'Chops trees, logs and enemy lines with equal enthusiasm.', ability: 'Wide Chop: axe swings hit every enemy in reach.',
    cost: 260, cd: 8, hp: 420, dmg: 38, rate: 1.4, range: 48, speed: 44, kb: 2,
    attack: 'area', anim: 'slash', animDur: 0.5, color: '#b45309', look: { weapon: 'axe', head: ['beard', 'bandana'] } },
  // ----- Super Rare -----
  { id: 'h_storm', rarity: 'SR', name: 'Stormstep', short: 'Storm', role: 'Assassin',
    desc: 'Moves between raindrops. Usually arrives before the thunder.', ability: 'Lightning Reflexes: dodges 35% of attacks, 25% crit chance.',
    cost: 220, cd: 5, hp: 220, dmg: 16, rate: 0.28, range: 34, speed: 140, kb: 2, dodge: 0.35, crit: 0.25, run: 'run',
    attack: 'melee', anim: 'ninja', animDur: 0.24, color: '#2563eb',
    look: { weapon: 'katana', head: ['ninjaband'], face: 'ninja', headFill: '#1e2a4a', band: '#60a5fa', ink: '#0b1736' } },
  { id: 'h_grove', rarity: 'SR', name: 'Grove Mender', short: 'Mender', role: 'Support',
    desc: 'An old hermit whose garden heals anything planted in it, including stickmen.', ability: 'Bloom Pulse: big heals over a wide radius.',
    cost: 300, cd: 12, hp: 300, dmg: 0, heal: 70, healR: 210, rate: 2.2, range: 150, speed: 40, kb: 1,
    attack: 'heal', anim: 'heal', animDur: 0.6, color: '#4ade80', hold: { shF: 0.4, elF: 0.9 },
    look: { weapon: 'wand', head: ['hood', 'beard'], hoodColor: '#15803d' } },
  { id: 'h_fizz', rarity: 'SR', name: 'Fizzbang', short: 'Fizzbang', role: 'Splash',
    desc: 'Mixes fireworks with bombs. Safety goggles are purely decorative.', ability: 'Mega Blast: bombs explode in a 105px radius.',
    cost: 320, cd: 10, hp: 190, dmg: 85, rate: 2.5, range: 210, speed: 40, kb: 1, aoe: 105,
    attack: 'bomb', anim: 'throw', animDur: 0.6, color: '#ec4899', look: { weapon: 'bomb', head: ['goggles'], back: 'bombpack', ink: '#4a0d2a' } },
  // ----- Epic -----
  { id: 'h_ronin', rarity: 'E', name: 'Inkblade Ronin', short: 'Ronin', role: 'Duelist',
    desc: 'A wandering swordsman drawn in a single unbroken brushstroke.', ability: 'Ink Crescent: blindingly fast slashes that hit every foe in reach.',
    cost: 450, cd: 14, hp: 950, dmg: 40, rate: 0.55, range: 58, speed: 60, kb: 3, crit: 0.2,
    attack: 'area', anim: 'ninja', animDur: 0.3, scale: 1.12, color: '#111827',
    look: { weapon: 'katana', head: ['ninjaband'], band: '#111827', cape: '#1f2937' } },
  { id: 'h_comet', rarity: 'E', name: 'Comet Sage', short: 'Comet', role: 'Mage',
    desc: 'Catches falling stars and throws them back, slightly annoyed.', ability: 'Starfall: huge magic splash that slows everything it hits.',
    cost: 480, cd: 14, hp: 260, dmg: 75, rate: 2.0, range: 260, speed: 36, kb: 1, aoe: 90, slow: 3,
    attack: 'magic', anim: 'staff', animDur: 0.65, color: '#60a5fa', hold: { shF: 0.4, elF: 0.9 },
    look: { weapon: 'staff', head: ['wizhat', 'beard'], aura: '#60a5fa', ink: '#1e3a8a' } },
  // ----- Legendary -----
  { id: 'h_sol', rarity: 'L', name: 'Sol, the Gilded', short: 'Sol', role: 'Champion',
    desc: 'Legend says the sun itself once doodled a hero. This is him.', ability: 'Solar Hammer: massive area smashes that shake the earth and launch foes.',
    cost: 900, cd: 26, hp: 3600, dmg: 210, rate: 2.0, range: 72, speed: 34, kb: 3, kbChance: 0.6, shake: 8, heavy: true,
    attack: 'area', anim: 'slam', animDur: 0.8, scale: 1.6, color: '#f5b301',
    look: { weapon: 'hammer', head: ['crown'], cape: '#f59e0b', aura: '#fde047', ink: '#7c4a03' } },

  // ----- Banner exclusives (limited) -----
  { id: 'h_lantern', rarity: 'E', limited: 'lights', name: 'Lantern Duelist', short: 'Lantern', role: 'Duelist',
    desc: 'Guards the paper-lantern festival, blade glowing like a candle.', ability: 'Festival Spark: 30% crits and a 30% chance to knock foes back.',
    cost: 420, cd: 12, hp: 720, dmg: 58, rate: 0.7, range: 36, speed: 62, kb: 2, crit: 0.3, kbChance: 0.3,
    attack: 'melee', anim: 'slash', animDur: 0.38, color: '#fb923c',
    look: { weapon: 'sword', head: ['hood'], hoodColor: '#ea580c', aura: '#fdba74' } },
  { id: 'h_thorn', rarity: 'L', limited: 'thicket', name: 'Thornback Juggernaut', short: 'Thornback', role: 'Juggernaut',
    desc: 'A walking bramble patch. Hugging him is not recommended.', ability: 'Bramble Hide: takes 35% less damage; spiked club smashes the whole area.',
    cost: 1000, cd: 28, hp: 5200, dmg: 160, rate: 2.3, range: 70, speed: 24, kb: 3, armor: 0.35, kbChance: 0.4, shake: 7, heavy: true,
    attack: 'area', anim: 'slam', animDur: 0.9, scale: 1.9, color: '#15803d',
    look: { weapon: 'bigclub', head: ['spikehelm'], aura: '#4ade80', ink: '#14532d' } },
  { id: 'h_phantom', rarity: 'SR', limited: 'glitch', name: 'Pixel Phantom', short: 'Phantom', role: 'Assassin',
    desc: 'Escaped from an old arcade cabinet. Flickers in and out of existence.', ability: 'Glitch Out: dodges 50% of all attacks.',
    cost: 240, cd: 6, hp: 200, dmg: 22, rate: 0.35, range: 34, speed: 120, kb: 2, dodge: 0.5, run: 'run',
    attack: 'melee', anim: 'ninja', animDur: 0.26, color: '#a855f7',
    look: { weapon: 'katana', head: ['fullhelm'], face: 'visor', headFill: '#1a1033', ink: '#4c1d95' } },
  { id: 'h_tide', rarity: 'E', limited: 'deep', name: 'Tidecaller', short: 'Tide', role: 'Mage',
    desc: 'Summons waves from a seashell. The beach misses her terribly.', ability: 'Riptide: splash orbs that knock enemies back.',
    cost: 430, cd: 13, hp: 280, dmg: 62, rate: 2.1, range: 240, speed: 38, kb: 1, aoe: 75, kbChance: 0.35,
    attack: 'magic', anim: 'staff', animDur: 0.65, color: '#06b6d4', hold: { shF: 0.4, elF: 0.9 },
    look: { weapon: 'staff', head: ['hood'], hoodColor: '#0891b2', aura: '#67e8f9', ink: '#164e63' } },
];
const HERO_BY_ID = Object.fromEntries(HEROES.map(h => [h.id, h]));
// Battle code expects these fields on every unit definition.
for (const h of HEROES) { h.hero = true; h.unlock = 0; }

/* Banners. The standard banner is permanent; limited banners rotate on a
   fixed schedule (two are live at any time, each runs for 2 periods). */
const BANNER_PERIOD_MS = 2 * 24 * 3600 * 1000;
const BANNER_EPOCH = Date.UTC(2026, 0, 1);
const BANNERS = [
  { id: 'standard', name: 'Standard Summon', tag: 'PERMANENT', permanent: true,
    desc: 'Every non-limited Stickfigure can appear here.', colors: ['#3b2a6b', '#6d4bd1'], featured: ['h_sol', 'h_comet', 'h_ronin'] },
  { id: 'lights', name: 'Festival of Lights', tag: 'LIMITED',
    desc: 'The Lantern Duelist joins for a limited time! Epic rate-up.', colors: ['#7c2d12', '#f97316'], featured: ['h_lantern', 'h_ember'] },
  { id: 'thicket', name: 'Wild Thicket', tag: 'LIMITED',
    desc: 'Legendary Thornback Juggernaut stomps out of the woods!', colors: ['#14532d', '#22c55e'], featured: ['h_thorn', 'h_lumber'] },
  { id: 'glitch', name: 'Glitch Week', tag: 'LIMITED',
    desc: 'Pixel Phantom has escaped the arcade. Super Rare rate-up!', colors: ['#2e1065', '#c026d3'], featured: ['h_phantom', 'h_storm'] },
  { id: 'deep', name: 'Deep Blue', tag: 'LIMITED',
    desc: 'Tidecaller rides in on the tide. Epic rate-up!', colors: ['#083344', '#06b6d4'], featured: ['h_tide', 'h_frost'] },
];
const BANNER_BY_ID = Object.fromEntries(BANNERS.map(b => [b.id, b]));
const LIMITED_BANNERS = BANNERS.filter(b => !b.permanent);

const GACHA = {
  single: 100,          // Stick Tokens per summon
  multi: 900,           // 10 summons (one Super Rare or better guaranteed)
  featuredChance: 0.6,  // chance a pull of a featured rarity is a featured figure
  pity: 80,             // Legendary guaranteed after this many pulls without one
  welcome: 500,         // one-time starter gift
};

const DAILY_REWARDS = [50, 60, 80, 100, 120, 150, 300];

/* Token rewards for battles. */
const TOKEN_REWARDS = {
  firstClear: n => 40 + 5 * n,
  bossBonus: 30,
  perNewStar: 10,
  replayWin: 5,
  perEndlessWave: 3,
};

/* Daily quests: three are picked each day. `key` matches Meta.track(). */
const QUEST_POOL = [
  { id: 'win2', text: 'Win 2 battles', key: 'wins', goal: 2, reward: 40 },
  { id: 'kills60', text: 'Defeat 60 enemies', key: 'kills', goal: 60, reward: 30 },
  { id: 'kills150', text: 'Defeat 150 enemies', key: 'kills', goal: 150, reward: 50 },
  { id: 'units30', text: 'Summon 30 stickmen in battle', key: 'units', goal: 30, reward: 30 },
  { id: 'thunder3', text: 'Use Thunder 3 times', key: 'thunders', goal: 3, reward: 30 },
  { id: 'boss1', text: 'Defeat a boss', key: 'bosses', goal: 1, reward: 50 },
  { id: 'star3', text: 'Win a level with 3 stars', key: 'threeStars', goal: 1, reward: 40 },
  { id: 'pull1', text: 'Summon on any banner', key: 'pulls', goal: 1, reward: 25 },
  { id: 'upgrade1', text: 'Level up a unit or Stickfigure', key: 'upgrades', goal: 1, reward: 25 },
  { id: 'endless5', text: 'Survive 5 waves in the Endless Arena', key: 'endlessWaves', goal: 5, reward: 50, needs: 'endless' },
];
const QUEST_BONUS = 60;  // for finishing all three

/* Lifetime achievements. `progress()` reads the save. */
const ACHIEVEMENTS = [
  { id: 'clear1', name: 'First Victory', text: 'Clear level 1', goal: 1, reward: 100, progress: s => Object.keys(s.cleared).length },
  { id: 'clear6', name: 'Desert Conqueror', text: 'Clear 6 levels', goal: 6, reward: 200, progress: s => Object.keys(s.cleared).length },
  { id: 'clear12', name: 'Shadow Slayer', text: 'Clear all 12 levels', goal: 12, reward: 500, progress: s => Object.keys(s.cleared).length },
  { id: 'stars', name: 'Perfectionist', text: 'Earn 36 stars', goal: 36, reward: 400, progress: s => Object.values(s.stars).reduce((a, b) => a + b, 0) },
  { id: 'kills500', name: 'Stick Smasher', text: 'Defeat 500 enemies', goal: 500, reward: 150, progress: s => s.life.kills || 0 },
  { id: 'kills3000', name: 'Army of One', text: 'Defeat 3,000 enemies', goal: 3000, reward: 300, progress: s => s.life.kills || 0 },
  { id: 'boss3', name: 'Giant Slayer', text: 'Defeat 3 bosses', goal: 3, reward: 150, progress: s => s.life.bosses || 0 },
  { id: 'pulls10', name: 'First Summons', text: 'Summon 10 times', goal: 10, reward: 100, progress: s => s.life.pulls || 0 },
  { id: 'pulls100', name: 'Summoner Supreme', text: 'Summon 100 times', goal: 100, reward: 300, progress: s => s.life.pulls || 0 },
  { id: 'collect5', name: 'Collector', text: 'Own 5 different Stickfigures', goal: 5, reward: 150, progress: s => Object.keys(s.heroes).length },
  { id: 'collectAll', name: 'Complete Collection', text: `Own all ${HEROES.length} Stickfigures`, goal: HEROES.length, reward: 1000, progress: s => Object.keys(s.heroes).length },
  { id: 'legend', name: 'Golden Moment', text: 'Pull a Legendary Stickfigure', goal: 1, reward: 200, progress: s => Object.keys(s.heroes).filter(id => HERO_BY_ID[id] && HERO_BY_ID[id].rarity === 'L').length },
  { id: 'herolv5', name: 'Power Up', text: 'Raise a Stickfigure to level 5', goal: 5, reward: 150, progress: s => Math.max(0, ...Object.values(s.heroes).map(h => h.lv)) },
  { id: 'endless15', name: 'Endless Endurance', text: 'Survive 15 Endless waves', goal: 15, reward: 250, progress: s => s.endlessBest || 0 },
];
