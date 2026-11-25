'use strict';
/* =========================================================
   Zodiac: the 12 signs (glyph, constellation, season) and
   the 12 Ultra Rare Zodiac Stickfigures, only summonable
   from the Zodiac banner.

   glyph  = SVG path data in a 100x100 box (drawn with Path2D)
   stars  = constellation stars in a 0..1 box, lines = pairs
   start  = [month, day] the sign's season begins
   pose   = which reveal entrance the summon animation uses
   ========================================================= */

const ZODIAC = [
  { id: 'aries', name: 'Aries', title: 'The Starbreaker', start: [3, 21], element: 'Fire', color: '#ef4444', pose: 'charge',
    glyph: 'M50,90 L50,42 C50,14 18,10 16,32 C15,44 26,48 33,42 M50,42 C50,14 82,10 84,32 C85,44 74,48 67,42',
    stars: [[0.1, 0.62], [0.42, 0.38], [0.6, 0.43], [0.9, 0.72]], lines: [[0, 1], [1, 2], [2, 3]] },
  { id: 'taurus', name: 'Taurus', title: 'The Astral Fortress', start: [4, 20], element: 'Earth', color: '#22c55e', pose: 'stomp',
    glyph: 'M14,16 C22,40 78,40 86,16 M50,40 A23,23 0 1 0 50.1,40 Z',
    stars: [[0.5, 0.72], [0.36, 0.52], [0.24, 0.36], [0.1, 0.16], [0.64, 0.52], [0.74, 0.38], [0.92, 0.2], [0.34, 0.6], [0.16, 0.6]],
    lines: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [1, 7], [7, 8]] },
  { id: 'gemini', name: 'Gemini', title: 'The Twin Paradox', start: [5, 21], element: 'Air', color: '#facc15', pose: 'split',
    glyph: 'M22,14 C40,22 60,22 78,14 M22,86 C40,78 60,78 78,86 M38,20 L38,80 M62,20 L62,80',
    stars: [[0.3, 0.1], [0.32, 0.34], [0.28, 0.6], [0.2, 0.9], [0.66, 0.14], [0.68, 0.38], [0.72, 0.62], [0.8, 0.9], [0.5, 0.32]],
    lines: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [1, 8], [8, 5]] },
  { id: 'cancer', name: 'Cancer', title: 'The Lunar Guardian', start: [6, 21], element: 'Water', color: '#93c5fd', pose: 'rise',
    glyph: 'M84,32 C70,16 40,14 22,30 M70,68 C56,84 30,86 16,70 M31,30 m-10,0 a10,10 0 1 0 20,0 a10,10 0 1 0 -20,0 M69,70 m-10,0 a10,10 0 1 0 20,0 a10,10 0 1 0 -20,0',
    stars: [[0.48, 0.14], [0.5, 0.44], [0.56, 0.6], [0.22, 0.88], [0.82, 0.84]], lines: [[0, 1], [1, 2], [2, 3], [2, 4]] },
  { id: 'leo', name: 'Leo', title: 'The Solar Sovereign', start: [7, 23], element: 'Fire', color: '#f59e0b', pose: 'roar',
    glyph: 'M38,62 m-13,0 a13,13 0 1 0 26,0 a13,13 0 1 0 -26,0 M50,60 C42,22 78,12 80,38 C82,58 58,66 66,84 C70,92 80,90 86,82',
    stars: [[0.14, 0.72], [0.18, 0.46], [0.3, 0.26], [0.46, 0.22], [0.54, 0.36], [0.44, 0.52], [0.76, 0.5], [0.92, 0.74], [0.64, 0.76]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 5]] },
  { id: 'virgo', name: 'Virgo', title: 'The Celestial Medic', start: [8, 23], element: 'Earth', color: '#4ade80', pose: 'float',
    glyph: 'M14,26 L14,82 M14,40 C14,22 34,22 34,40 L34,82 M34,40 C34,22 56,22 56,40 L56,74 C56,90 74,92 82,78 M56,62 C70,44 90,52 76,72 C70,80 62,80 58,76',
    stars: [[0.08, 0.3], [0.28, 0.4], [0.46, 0.34], [0.56, 0.56], [0.4, 0.72], [0.72, 0.6], [0.92, 0.76], [0.64, 0.88], [0.3, 0.2]],
    lines: [[8, 0], [0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [5, 6], [5, 7]] },
  { id: 'libra', name: 'Libra', title: 'The Cosmic Arbiter', start: [9, 23], element: 'Air', color: '#a855f7', pose: 'balance',
    glyph: 'M12,82 L88,82 M12,64 L34,64 C24,30 76,30 66,64 L88,64',
    stars: [[0.5, 0.12], [0.24, 0.42], [0.76, 0.44], [0.18, 0.82], [0.84, 0.8]], lines: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4]] },
  { id: 'scorpio', name: 'Scorpio', title: 'The Void Stinger', start: [10, 23], element: 'Water', color: '#7c3aed', pose: 'emerge',
    glyph: 'M14,26 L14,80 M14,40 C14,22 34,22 34,40 L34,80 M34,40 C34,22 56,22 56,40 L56,72 C56,84 66,86 82,76 M72,68 L84,76 L76,88',
    stars: [[0.06, 0.18], [0.14, 0.34], [0.04, 0.48], [0.26, 0.44], [0.38, 0.52], [0.5, 0.6], [0.58, 0.76], [0.7, 0.88], [0.86, 0.84], [0.94, 0.68], [0.88, 0.58]],
    lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]] },
  { id: 'sagittarius', name: 'Sagittarius', title: 'The Starhunter', start: [11, 22], element: 'Fire', color: '#38bdf8', pose: 'shoot',
    glyph: 'M18,84 L82,18 M54,18 L82,18 L82,46 M34,46 L56,68',
    stars: [[0.28, 0.42], [0.44, 0.3], [0.6, 0.34], [0.7, 0.56], [0.54, 0.72], [0.34, 0.66], [0.88, 0.44], [0.16, 0.56], [0.5, 0.12]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [2, 6], [3, 6], [5, 7], [0, 7], [1, 8]] },
  { id: 'capricorn', name: 'Capricorn', title: 'The Eternal Summit', start: [12, 22], element: 'Earth', color: '#14b8a6', pose: 'summit',
    glyph: 'M12,28 L26,76 L40,28 C46,16 58,22 58,40 L58,66 C58,86 84,88 84,70 C84,56 64,56 62,72 C60,86 46,90 38,82',
    stars: [[0.08, 0.3], [0.32, 0.56], [0.56, 0.82], [0.78, 0.68], [0.92, 0.36], [0.56, 0.42], [0.26, 0.24]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]] },
  { id: 'aquarius', name: 'Aquarius', title: 'The Starflow', start: [1, 20], element: 'Air', color: '#22d3ee', pose: 'splash',
    glyph: 'M10,46 L26,32 L42,46 L58,32 L74,46 L90,32 M10,72 L26,58 L42,72 L58,58 L74,72 L90,58',
    stars: [[0.12, 0.22], [0.3, 0.28], [0.44, 0.44], [0.56, 0.32], [0.7, 0.5], [0.6, 0.7], [0.82, 0.84], [0.38, 0.78]], lines: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6], [5, 7]] },
  { id: 'pisces', name: 'Pisces', title: 'The Dreamweaver', start: [2, 19], element: 'Water', color: '#c4b5fd', pose: 'swirl',
    glyph: 'M24,12 C46,32 46,68 24,88 M76,12 C54,32 54,68 76,88 M20,50 L80,50',
    stars: [[0.08, 0.18], [0.2, 0.38], [0.36, 0.6], [0.52, 0.86], [0.68, 0.62], [0.84, 0.4], [0.92, 0.18], [0.16, 0.08], [0.82, 0.08]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [0, 7], [6, 8]] },
];
const ZODIAC_BY_ID = Object.fromEntries(ZODIAC.map(z => [z.id, z]));

/* The 12 Zodiac Stickfigures. `fx` names the ability module in abilities.js. */
const Z = (sign, def) => Object.assign({ id: 'h_' + sign, rarity: 'UR', limited: 'zodiac', zodiac: sign, fx: sign, name: ZODIAC_BY_ID[sign].name, short: ZODIAC_BY_ID[sign].name, title: ZODIAC_BY_ID[sign].title, color: ZODIAC_BY_ID[sign].color }, def);
const ZODIAC_HEROES = [
  Z('aries', { role: 'Frontline',
    desc: 'Hot-headed and fearless. Aries charges first and asks questions never.',
    ability: 'Meteor Charge: every 3rd attack Aries rams forward, dealing 2.6x impact damage to every foe ahead and knocking them back. Resists knockback.',
    cost: 380, cd: 11, hp: 1250, dmg: 46, rate: 0.9, range: 30, speed: 58, kb: 2, kbResist: 0.7, charge: { every: 3, mult: 2.6, reach: 90, dash: 60 },
    attack: 'melee', anim: 'punch', animDur: 0.34,
    look: { ink: '#7f1d1d', headFill: '#fff1f2', weapon: 'starfists', head: ['ramhorns'], body: ['ariesArmor'] } }),
  Z('taurus', { role: 'Tank',
    desc: 'Patient, immovable and stubborn as a mountain. Nothing gets past Taurus.',
    ability: 'Unshakable: takes 50% less damage and cannot be knocked back. Every 8s grants nearby allies a star shield that absorbs damage.',
    cost: 450, cd: 16, hp: 3400, dmg: 22, rate: 1.5, range: 32, speed: 26, kb: 1, kbResist: 1, armor: 0.5, scale: 1.45, heavy: true,
    shieldPulse: { every: 8, r: 190, amt: 140, pct: 0.05, dur: 6 },
    attack: 'melee', anim: 'bash', animDur: 0.55, hold: { shF: 0.75, elF: 0.55 },
    look: { ink: '#292524', headFill: '#e7e5e4', weapon: 'aegis', head: ['bullhorns'], body: ['stonePlate'] } }),
  Z('gemini', { role: 'Hybrid',
    desc: 'Two minds, one heartbeat. The twins finish each other\'s combos.',
    ability: 'Duality: fights beside a spectral blue twin that mirrors every attack with a thrown star (55% damage). When one twin is hit, the other gains 40% speed. The twin reforms 10s after falling.',
    cost: 420, cd: 13, hp: 760, dmg: 40, rate: 0.8, range: 34, speed: 54, kb: 2, twin: { dmg: 0.55, hp: 0.7, respawn: 10 },
    attack: 'melee', anim: 'slash', animDur: 0.4,
    look: { ink: '#854d0e', headFill: '#fef9c3', weapon: 'sword', head: ['geminiCrest'], under: ['twinGhost'] } }),
  Z('cancer', { role: 'Protector',
    desc: 'Gentle, loyal and fiercely protective: the moon\'s own shield-bearer.',
    ability: 'Moonlit Shelter: every 7s wraps nearby allies in a moon barrier that blocks 40% of incoming damage for 4.5s.',
    cost: 380, cd: 14, hp: 1700, dmg: 20, rate: 1.4, range: 30, speed: 32, kb: 1, kbResist: 0.6, armor: 0.3,
    barrier: { every: 7, r: 180, dur: 4.5, cut: 0.4 },
    attack: 'melee', anim: 'bash', animDur: 0.5, hold: { shF: 0.75, elF: 0.55 },
    look: { ink: '#334155', headFill: '#f1f5f9', weapon: 'crabclaw', head: ['moonhelm'], back: 'moonshell', under: ['tidalAura', 'moonShards'], over: ['moonShards'] } }),
  Z('leo', { role: 'Buffer',
    desc: 'A born ruler who shines brightest when the whole army roars with him.',
    ability: 'Royal Radiance: allies within 180px deal +25% damage. Whenever Leo lands a killing blow he roars, giving nearby allies +40% attack speed for 4s.',
    cost: 450, cd: 15, hp: 1150, dmg: 52, rate: 1.0, range: 36, speed: 46, kb: 2, radiance: { r: 180, dmg: 1.25 }, roar: { r: 220, dur: 4 },
    attack: 'melee', anim: 'slash', animDur: 0.42,
    look: { ink: '#78350f', headFill: '#fffbeb', weapon: 'sunblade', head: ['suncrown'], under: ['sunmane'], cape: '#f59e0b' } }),
  Z('virgo', { role: 'Healer',
    desc: 'Meticulous and kind. Virgo tends to every wound, the worst ones first.',
    ability: 'Astral Restoration: every 2.8s heals all nearby allies. The lower an ally\'s health, the stronger the heal (up to 3x).',
    cost: 400, cd: 14, hp: 620, dmg: 0, heal: 42, healR: 210, rate: 2.8, range: 160, speed: 40, kb: 1,
    attack: 'astral', anim: 'heal', animDur: 0.6, hold: { shF: 0.4, elF: 0.9 },
    look: { ink: '#14532d', headFill: '#ffffff', weapon: 'flowerstaff', head: ['leafhalo'], body: ['robeVirgo'] } }),
  Z('libra', { role: 'Debuffer',
    desc: 'Calm judge of the cosmos. Libra weighs the mightiest foe and finds it wanting.',
    ability: 'Equilibrium: locks onto the strongest enemy in range, cutting its attack and movement by 40% (25% on bosses) while orbiting blades strike it. Shifts to a new target when it falls.',
    cost: 420, cd: 14, hp: 650, dmg: 24, rate: 1.4, range: 260, speed: 38, kb: 1, weaken: { f: 0.6, boss: 0.75 },
    attack: 'judge', anim: 'balance', animDur: 0.5,
    look: { ink: '#3b0764', headFill: '#faf5ff', head: ['libraHalo'], body: ['robeLibra'], under: ['libraSigil', 'orbitBlades'], over: ['floatScales', 'orbitBlades'] } }),
  Z('scorpio', { role: 'Venom',
    desc: 'Quiet, intense and endlessly patient. The venom does the talking.',
    ability: 'Nebula Venom: every hit adds a stack of cosmic poison (up to 6) that deals damage over time. Bosses take at most 3 stacks at half strength.',
    cost: 380, cd: 12, hp: 760, dmg: 20, rate: 0.75, range: 40, speed: 58, kb: 2, venom: { dps: 8, max: 6, bossMax: 3, bossMult: 0.5, dur: 5 },
    attack: 'melee', anim: 'sting', animDur: 0.36,
    look: { ink: '#1e1b2e', headFill: '#1e1033', face: 'void', head: ['scorpHelm'], body: ['exoPlates'], under: ['scorpTail'] } }),
  Z('sagittarius', { role: 'Sniper',
    desc: 'A free-spirited wanderer whose arrows chase the horizon.',
    ability: 'Piercing Constellation: arrows fly straight and pierce every enemy they pass. Every 4th shot is a star arrow with 1.8x damage and far longer range.',
    cost: 420, cd: 13, hp: 420, dmg: 46, rate: 1.9, range: 320, speed: 40, kb: 1, volley: { every: 4, mult: 1.8, range: 560 },
    attack: 'pierce', anim: 'bow', animDur: 0.8, hold: { shF: 0.9, elF: 0.4 },
    look: { ink: '#0c4a6e', headFill: '#f0f9ff', weapon: 'starbow', head: ['hood'], hoodColor: '#1e40af', cape: '#1e3a8a', under: ['centaurStars'] } }),
  Z('capricorn', { role: 'Controller',
    desc: 'Disciplined and unyielding. The whole battlefield bends to its gravity.',
    ability: 'Gravity Anchor: projects a gravity field ahead that slows enemies by 45% (weaker foes 70%, bosses 25%) and interrupts charging Boomers. Cannot be knocked back.',
    cost: 420, cd: 15, hp: 1500, dmg: 34, rate: 2.2, range: 50, speed: 30, kb: 1, kbResist: 1, heavy: true,
    gravity: { off: 120, r: 150, weak: 0.3, mid: 0.55, boss: 0.75 },
    attack: 'area', anim: 'slam', animDur: 0.8,
    look: { ink: '#134e4a', headFill: '#f0fdfa', weapon: 'runestaff', head: ['goathorns'], body: ['mountainArmor'], under: ['runeRock'] } }),
  Z('aquarius', { role: 'Crowd Control',
    desc: 'A visionary who reshapes the whole battle with a single pour.',
    ability: 'Cosmic Tide: every 6s pours a rolling wave that sweeps forward, pushing back every enemy it touches and slowing them for 2s.',
    cost: 380, cd: 13, hp: 720, dmg: 16, rate: 6, range: 210, speed: 38, kb: 1, tide: { speed: 340, dist: 330, slow: 2 },
    attack: 'tide', anim: 'pour', animDur: 0.7,
    look: { ink: '#0e7490', headFill: '#ecfeff', weapon: 'vessel', head: ['aquaCrest'], under: ['floatRings'], over: ['floatRings'] } }),
  Z('pisces', { role: 'Summoner',
    desc: 'A gentle dreamer whose imaginary friends turn out to be very real.',
    ability: 'Dreamspawn: every 5s summons 3 astral fish (up to 6) that dart to the front, dodge attacks and soak hits for 10s.',
    cost: 360, cd: 14, hp: 560, dmg: 0, rate: 5, range: 200, speed: 40, kb: 1, dream: { n: 3, max: 6, life: 10 },
    attack: 'dream', anim: 'heal', animDur: 0.6, hold: { shF: 0.4, elF: 0.9 },
    look: { ink: '#6d28d9', headFill: '#faf5ff', weapon: 'dreamorb', head: ['dreamHalo'], under: ['fishOrbit'], over: ['fishOrbit'] } }),
];

/* Units created by Zodiac abilities. */
const ZODIAC_SPAWNED = {
  gemTwin: { id: 'gem_twin', name: 'Gemini (Blue Twin)', short: 'Twin', hp: 500, dmg: 20, rate: 99, range: 160, speed: 54, kb: 1,
    attack: 'star', anim: 'throw', animDur: 0.45, color: '#3b82f6', fx: 'gemTwin',
    look: { ink: '#1e3a8a', headFill: '#dbeafe', weapon: 'chakram', head: ['geminiCrest'] } },
  dreamfish: { id: 'dreamfish', name: 'Astral Fish', minion: true, sprite: 'fish', hp: 190, dmg: 5, rate: 1, range: 26, speed: 95, kb: 1, dodge: 0.25,
    attack: 'melee', anim: 'punch', animDur: 0.3, color: '#a5f3fc', look: {} },
};

/* The sign whose season it is right now, and when the next one begins. */
function zodiacSeason(t) {
  const now = new Date(t);
  const y = now.getFullYear();
  const starts = [];
  for (const yy of [y - 1, y, y + 1]) for (const z of ZODIAC) starts.push({ z, t: new Date(yy, z.start[0] - 1, z.start[1]).getTime() });
  starts.sort((a, b) => a.t - b.t);
  let i = 0;
  while (i < starts.length - 1 && starts[i + 1].t <= now.getTime()) i++;
  return { sign: starts[i].z, hero: ZODIAC_HEROES.find(h => h.zodiac === starts[i].z.id), next: starts[i + 1].z, nextAt: starts[i + 1].t };
}
