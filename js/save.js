'use strict';
/* Persistent progress (localStorage) + derived progression helpers. */

const Save = (() => {
  const KEY = 'battleSticks.save.v1';
  const fresh = () => ({
    xp: 0,
    unitLv: {},          // id -> level (>=1)
    cleared: {},         // level n -> true
    stars: {},           // level n -> 0..3
    lab: {},             // upgrade id -> level
    endlessBest: 0,
    tutorial: false,
    settings: { sfx: true, music: true, shake: true, autocam: true },
  });
  let data = fresh();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        data = Object.assign(fresh(), parsed);
        data.settings = Object.assign(fresh().settings, parsed.settings || {});
      }
    } catch (e) { /* storage unavailable: play without saving */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }
  function reset() { data = fresh(); save(); }

  return { load, save, reset, get d() { return data; } };
})();

const Progress = {
  isUnitUnlocked(def) { return def.unlock === 0 || !!Save.d.cleared[def.unlock]; },
  unitLv(id) { return Save.d.unitLv[id] || 1; },
  unitMult(lv) { return 1 + 0.15 * (lv - 1); },
  unitUpCost(def, lv) { return Math.round(def.xp * Math.pow(lv, 1.35)); },
  /** The level that unlocks a given unit (or null for starters). */
  unlockLevelOf(def) { return def.unlock ? LEVELS[def.unlock - 1] : null; },

  isLevelUnlocked(n) { return n === 1 || !!Save.d.cleared[n - 1]; },
  isEndlessUnlocked() { return !!Save.d.cleared[ENDLESS.unlockAfter]; },
  /** Highest playable level number. */
  frontier() {
    let n = 1;
    while (n < LEVELS.length && Save.d.cleared[n]) n++;
    return n;
  },

  labLv(id) { return Save.d.lab[id] || 0; },
  labCost(up, lv) { return up.base + up.step * lv; },

  /** Combat modifiers from the permanent upgrades. */
  mods() {
    const l = id => Progress.labLv(id);
    return {
      baseHp: 1 + 0.15 * l('tower'),
      goldMult: 1 + 0.08 * l('mine'),
      startGold: 100 + 75 * l('chest'),
      thunderDmg: 160 * (1 + 0.25 * l('storm')),
      thunderTime: 32 * Math.pow(0.92, l('battery')),
      cdMult: 1 - 0.05 * l('drill'),
      bounty: 1 + 0.1 * l('bounty'),
    };
  },

  /** Units the player brings into battle (unlocked ones, in slot order). */
  roster() {
    return UNITS.map(def => ({ def, lv: Progress.unitLv(def.id), unlocked: Progress.isUnitUnlocked(def) }));
  },

  starsFor(baseFrac) { return baseFrac >= 0.7 ? 3 : baseFrac >= 0.35 ? 2 : 1; },
  totalStars() { return Object.values(Save.d.stars).reduce((a, b) => a + b, 0); },
};
