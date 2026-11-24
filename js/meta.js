'use strict';
/* =========================================================
   Meta progression around the battles:
   Stick Tokens, daily login rewards, daily quests,
   achievements, banner rotation, summoning (gacha),
   duplicate -> Stick Shards, Stickfigure levels and the
   10-slot battle squad.
   All state lives in Save.d; UI listens via Meta.onChange.
   ========================================================= */

const Meta = (() => {
  let timeOffset = 0;            // for testing banner rotation / daily resets
  let welcomePending = false;
  const listeners = [];
  const S = () => Save.d;
  const now = () => Date.now() + timeOffset;
  const DAY = 86400000;
  const dayKey = t => { const d = new Date(t == null ? now() : t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

  function changed() { Save.save(); for (const fn of listeners) fn(); }

  /** Fill in fields for fresh or older saves. */
  function ensure() {
    const s = S();
    if (typeof s.tokens !== 'number') s.tokens = 0;
    if (typeof s.shards !== 'number') s.shards = 0;
    if (!s.heroes) s.heroes = {};
    if (typeof s.pity !== 'number') s.pity = 0;
    if (!s.life) s.life = {};
    if (!s.daily) s.daily = { last: null, streak: 0 };
    if (!s.achClaimed) s.achClaimed = {};
    if (!s.achSeen) s.achSeen = {};
    if (!Array.isArray(s.squad)) s.squad = UNITS.map(u => u.id);
    if (!s.welcome) { s.welcome = true; s.tokens += GACHA.welcome; welcomePending = true; }
    // quietly mark achievements already earned by older saves as "seen"
    for (const a of ACHIEVEMENTS) if (a.progress(s) >= a.goal) s.achSeen[a.id] = true;
    refreshQuests();
    Save.save();
  }

  // ---------- tokens ----------
  function addTokens(n) { if (n > 0) { S().tokens += n; changed(); } return n; }
  function spend(n) { if (S().tokens < n) return false; S().tokens -= n; changed(); return true; }

  // ---------- daily login ----------
  function dailyState() {
    const s = S(), today = dayKey();
    if (s.daily.last === today) return { claimable: false, day: s.daily.streak };
    const cont = s.daily.last === dayKey(now() - DAY);
    return { claimable: true, day: cont ? (s.daily.streak % DAILY_REWARDS.length) + 1 : 1 };
  }
  function claimDaily() {
    const st = dailyState();
    if (!st.claimable) return 0;
    S().daily = { last: dayKey(), streak: st.day };
    return addTokens(DAILY_REWARDS[st.day - 1]);
  }
  function takeWelcome() { const w = welcomePending; welcomePending = false; return w ? GACHA.welcome : 0; }

  // ---------- daily quests ----------
  function refreshQuests() {
    const s = S(), today = dayKey();
    if (s.quests && s.quests.day === today) return;
    const rng = U.rng(U.hash('q' + today));
    const pool = QUEST_POOL.filter(q => !q.needs || (q.needs === 'endless' && Progress.isEndlessUnlocked()));
    const ids = [], keys = new Set();
    let guard = 0;
    while (ids.length < 3 && guard++ < 100) {
      const q = pool[(rng() * pool.length) | 0];
      if (ids.includes(q.id) || keys.has(q.key)) continue;
      ids.push(q.id); keys.add(q.key);
    }
    s.quests = { day: today, ids, prog: {}, claimed: {}, bonus: false };
  }
  function questList() {
    refreshQuests();
    const s = S();
    return s.quests.ids.map(id => {
      const q = QUEST_POOL.find(x => x.id === id);
      const prog = Math.min(q.goal, s.quests.prog[q.key] || 0);
      return { q, prog, done: prog >= q.goal, claimed: !!s.quests.claimed[id] };
    });
  }
  function claimQuest(id) {
    const it = questList().find(x => x.q.id === id);
    if (!it || !it.done || it.claimed) return 0;
    S().quests.claimed[id] = true;
    return addTokens(it.q.reward);
  }
  function bonusState() { const l = questList(); return { ready: l.every(x => x.claimed), claimed: S().quests.bonus }; }
  function claimBonus() {
    const b = bonusState();
    if (!b.ready || b.claimed) return 0;
    S().quests.bonus = true;
    return addTokens(QUEST_BONUS);
  }
  function msToNextDay() { const d = new Date(now()); d.setHours(24, 0, 0, 0); return d.getTime() - now(); }

  /** Record progress for quests + lifetime counters. */
  function track(key, amt = 1) {
    if (!amt) return;
    refreshQuests();
    const s = S();
    s.quests.prog[key] = (s.quests.prog[key] || 0) + amt;
    s.life[key] = (s.life[key] || 0) + amt;
  }

  // ---------- achievements ----------
  function achList() {
    const s = S();
    return ACHIEVEMENTS.map(a => {
      const prog = Math.min(a.goal, a.progress(s));
      return { a, prog, done: prog >= a.goal, claimed: !!s.achClaimed[a.id] };
    });
  }
  function claimAch(id) {
    const it = achList().find(x => x.a.id === id);
    if (!it || !it.done || it.claimed) return 0;
    S().achClaimed[id] = true;
    return addTokens(it.a.reward);
  }
  /** Newly completed achievements since the last call (for toasts). */
  function newAchievements() {
    const s = S(), out = [];
    for (const it of achList()) if (it.done && !s.achSeen[it.a.id]) { s.achSeen[it.a.id] = true; out.push(it.a); }
    if (out.length) Save.save();
    return out;
  }
  function claimableCount() {
    const q = questList().filter(x => x.done && !x.claimed).length + (bonusState().ready && !bonusState().claimed ? 1 : 0);
    const a = achList().filter(x => x.done && !x.claimed).length;
    return { quests: q, ach: a, daily: dailyState().claimable ? 1 : 0 };
  }

  // ---------- banners ----------
  const period = () => Math.floor((now() - BANNER_EPOCH) / BANNER_PERIOD_MS);
  const endOf = p => BANNER_EPOCH + (p + 1) * BANNER_PERIOD_MS;
  function activeBanners() {
    const k = period(), n = LIMITED_BANNERS.length, mod = i => ((i % n) + n) % n;
    return {
      list: [
        { banner: BANNER_BY_ID.standard, ends: null },
        { banner: LIMITED_BANNERS[mod(k)], ends: endOf(k) },
        { banner: LIMITED_BANNERS[mod(k + 1)], ends: endOf(k + 1) },
      ],
      next: { banner: LIMITED_BANNERS[mod(k + 2)], starts: endOf(k) },
      period: k,
    };
  }
  function isActive(bannerId) { return activeBanners().list.some(x => x.banner.id === bannerId); }
  /** Heroes obtainable from a banner, per rarity. */
  function poolFor(banner, rarity) {
    const base = HEROES.filter(h => h.rarity === rarity && (!h.limited || h.limited === banner.id));
    const featured = banner.permanent ? [] : banner.featured.map(id => HERO_BY_ID[id]).filter(h => h && h.rarity === rarity);
    return { base, featured };
  }
  function bannerPool(banner) { return HEROES.filter(h => !h.limited || h.limited === banner.id); }

  function rollRarity(rng, minIdx) {
    const entries = RARITIES.map((r, i) => [i, i >= minIdx ? r.rate : 0]);
    return U.weighted(entries, rng());
  }
  function pickHero(banner, rIdx, rng) {
    for (let i = rIdx; i >= 0; i--) {
      const { base, featured } = poolFor(banner, RARITIES[i].id);
      if (featured.length && rng() < GACHA.featuredChance) return featured[(rng() * featured.length) | 0];
      if (base.length) return base[(rng() * base.length) | 0];
    }
    return HEROES[0];
  }

  /**
   * Summon `count` (1 or 10) times on a banner.
   * Returns { ok, reason, results: [{hero, rIdx, isNew, shards}] }
   */
  function pull(bannerId, count, rng = Math.random) {
    const banner = BANNER_BY_ID[bannerId];
    if (!banner || !isActive(bannerId)) return { ok: false, reason: 'ended' };
    const cost = count === 10 ? GACHA.multi : GACHA.single * count;
    const s = S();
    if (s.tokens < cost) return { ok: false, reason: 'tokens', cost };
    s.tokens -= cost;
    const results = [];
    for (let i = 0; i < count; i++) {
      s.pity++;
      let rIdx;
      if (s.pity >= GACHA.pity) rIdx = 4;
      else if (count === 10 && i === 9 && !results.some(r => r.rIdx >= 2)) rIdx = rollRarity(rng, 2);
      else rIdx = rollRarity(rng, 0);
      const hero = pickHero(banner, rIdx, rng);
      rIdx = RARITY[hero.rarity].idx;
      if (rIdx === 4) s.pity = 0;
      const owned = s.heroes[hero.id];
      let shards = 0, isNew = false;
      if (owned) { shards = RARITY[hero.rarity].shards; owned.copies = (owned.copies || 1) + 1; s.shards += shards; }
      else { s.heroes[hero.id] = { lv: 1, copies: 1, got: now() }; isNew = true; }
      results.push({ hero, rIdx, isNew, shards });
    }
    track('pulls', count);
    changed();
    return { ok: true, results };
  }
  const pityLeft = () => Math.max(1, GACHA.pity - S().pity);

  // ---------- Stickfigure levels ----------
  const heroMult = lv => 1 + 0.12 * (lv - 1);
  const heroUpCost = (h, lv) => RARITY[h.rarity].upBase * lv;
  function upgradeHero(id) {
    const s = S(), h = HERO_BY_ID[id], o = s.heroes[id];
    if (!h || !o || o.lv >= HERO_MAX_LV) return false;
    const c = heroUpCost(h, o.lv);
    if (s.shards < c) return false;
    s.shards -= c; o.lv++;
    track('upgrades');
    changed();
    return true;
  }

  // ---------- squad ----------
  function squad() {
    const s = S();
    const out = [];
    for (let i = 0; i < UNITS.length; i++) {
      const id = s.squad[i];
      const ok = id && (UNIT_BY_ID[id] || (HERO_BY_ID[id] && s.heroes[id])) && out.indexOf(id) < 0;
      out.push(ok ? id : UNITS[i].id);
    }
    s.squad = out;
    return out;
  }
  function equip(heroId, slot) {
    const sq = squad();
    if (!S().heroes[heroId] || slot < 0 || slot >= sq.length) return false;
    const j = sq.indexOf(heroId);
    if (j >= 0) sq[j] = UNITS[j].id;
    sq[slot] = heroId;
    S().squad = sq;
    changed();
    return true;
  }
  function unequip(slot) { const sq = squad(); sq[slot] = UNITS[slot].id; S().squad = sq; changed(); }
  const slotOf = heroId => squad().indexOf(heroId);

  // ---------- battle hooks ----------
  /** Count a battle's stats towards quests/achievements (once per battle). */
  function creditBattle(b) {
    if (b.credited || b.demo) return;
    b.credited = true;
    track('kills', b.stats.kills);
    track('units', b.stats.summoned);
    track('thunders', b.stats.thunders || 0);
    track('bosses', b.stats.bossKills || 0);
    track('battles', 1);
    Save.save();
  }
  /** Token rewards for a finished battle. info: {win, first, newStars, stars, survived} */
  function battleTokens(b, info) {
    creditBattle(b);
    const L = b.L;
    let t = 0;
    if (b.endless) {
      t = info.survived * TOKEN_REWARDS.perEndlessWave;
      track('endlessWaves', info.survived);
    } else if (info.win) {
      track('wins', 1);
      if (info.stars === 3) track('threeStars', 1);
      t = info.first ? TOKEN_REWARDS.firstClear(L.n) + (L.boss ? TOKEN_REWARDS.bossBonus : 0) : TOKEN_REWARDS.replayWin;
      t += info.newStars * TOKEN_REWARDS.perNewStar;
    }
    addTokens(t);
    Save.save();
    return t;
  }

  return {
    ensure, now, dayKey, onChange: fn => listeners.push(fn), changed,
    addTokens, spend, takeWelcome,
    dailyState, claimDaily,
    questList, claimQuest, bonusState, claimBonus, msToNextDay, track,
    achList, claimAch, newAchievements, claimableCount,
    activeBanners, isActive, poolFor, bannerPool, pull, pityLeft,
    heroMult, heroUpCost, upgradeHero,
    squad, equip, unequip, slotOf,
    creditBattle, battleTokens,
    setTimeOffset: ms => { timeOffset = ms; },
  };
})();
