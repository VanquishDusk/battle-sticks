'use strict';
/* =========================================================
   UI: screens, menus, battle HUD, input and the flow between
   them. The canvas below is drawn by main.js.
   ========================================================= */

const UI = (() => {
  const $ = U.$, $$ = U.$$;
  const ICON = {
    lock: '<svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.2A1.8 1.8 0 0 1 20 11.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 20.2v-8.4A1.8 1.8 0 0 1 5.8 10zm2.6 0h4.8V7a2.4 2.4 0 0 0-4.8 0z"/></svg>',
    tower: '<svg viewBox="0 0 24 24"><path d="M4 22V9h2V5h3v2h2V3h2v4h2V5h3v4h2v13h-6v-5a2 2 0 0 0-4 0v5z"/></svg>',
    coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5h4.5a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3H15" fill="none"/></svg>',
    chest: '<svg viewBox="0 0 24 24"><path d="M3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1H3zM3 12h18v8H3z"/><rect x="10" y="10" width="4" height="5" rx="1"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13.5 1 4 13.5h6.2L8.8 23 20 9.8h-6.6z"/></svg>',
    battery: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="18" height="10" rx="2"/><rect x="20" y="10" width="2.5" height="4" rx="1"/><path d="M11.5 8.5 8 13h3l-.8 3L14 11h-3z" fill="#fff"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="9"/><path d="M12 8v5l3 2M9 2h6" fill="none"/></svg>',
    skull: '<svg viewBox="0 0 24 24"><path d="M12 2a9 9 0 0 0-9 9c0 3 1.5 5 3 6v3h3v-2h2v2h2v-2h2v2h3v-3c1.5-1 3-3 3-6a9 9 0 0 0-9-9z"/><circle cx="8.5" cy="11" r="2" fill="#333"/><circle cx="15.5" cy="11" r="2" fill="#333"/></svg>',
  };
  const STAR = on => `<span class="star${on ? ' on' : ''}">&#9733;</span>`;

  let slots = [];          // [{el, def, lv, unlocked, cd, cdt, wasReady}]
  let hud = {};            // cached DOM refs + last values
  let tip = null;          // tutorial state
  let toastT = null;
  let currentLevel = null; // level card selection
  let barracksCanvases = [];
  let bkTab = 'units', dkSel = null;

  // ---------------- generic ----------------
  function show(name) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'scr-' + name));
    Game.screen = name;
    if (name === 'map') refreshMap();
    if (name === 'barracks') { buildBarracks(); buildDeck(); setBkTab(bkTab); }
    if (name === 'lab') buildLab();
    refreshXP();
    Sound.startMusic(name === 'battle' ? 'battle' : 'menu');
    if (typeof MetaUI !== 'undefined') MetaUI.onShow(name);
  }
  function overlay(id, on) { $('#' + id).classList.toggle('show', !!on); }
  function anyOverlay() { return $$('.overlay.show').length > 0; }
  function refreshXP() { $$('.xp-n').forEach(e => (e.textContent = U.fmt(Save.d.xp))); }
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1100);
  }
  function banner(text, cls, small) {
    const wrap = $('#banner-wrap');
    const b = U.el('div', 'banner ' + (cls || ''), text + (small ? `<small>${small}</small>` : ''));
    wrap.innerHTML = ''; wrap.appendChild(b);
    setTimeout(() => b.remove(), 2000);
  }
  function confirmBox(title, text, onYes) {
    $('#cf-title').textContent = title; $('#cf-text').textContent = text;
    overlay('ov-confirm', true);
    $('#cf-yes').onclick = () => { overlay('ov-confirm', false); onYes(); };
    $('#cf-no').onclick = () => overlay('ov-confirm', false);
  }
  function click() { Sound.play('click', 0.02); }

  // ---------------- map ----------------
  const campOf = n => (LEVELS[n - 1] && LEVELS[n - 1].c) || 1;
  const campUnlocked = c => { const C = CAMPAIGNS[c - 1]; return !C.unlockAfter || !!Save.d.cleared[C.unlockAfter]; };
  let mapCamp = null, pendingLevel = null;
  function buildMap() {
    if (mapCamp == null) mapCamp = campOf(Progress.frontier());
    Game.mapCamp = mapCamp;
    const wrap = $('#map-nodes');
    wrap.innerHTML = '';
    REGIONS.filter(r => r.campaign === mapCamp).forEach((r, i) => {
      const lbl = U.el('div', 'region-label', r.name);
      lbl.style.left = i * 320 + 160 + 'px';
      wrap.appendChild(lbl);
    });
    const tabs = U.el('div', 'camp-tabs');
    for (const C of CAMPAIGNS) {
      const open = campUnlocked(C.id);
      const t = U.el('button', 'camp-tab' + (C.id === mapCamp ? ' active' : '') + (open ? '' : ' locked'),
        `<small>CAMPAIGN ${C.id}</small>${open ? C.name : `${ICON.lock} ${C.name}`}`);
      t.style.setProperty('--cc', C.color);
      t.addEventListener('click', () => {
        if (!open) { Sound.play('error'); toast(`Clear Level ${C.unlockAfter}: ${LEVELS[C.unlockAfter - 1].name} to unlock`); return; }
        if (mapCamp === C.id) return;
        click(); mapCamp = C.id; buildMap(); refreshMap();
      });
      tabs.appendChild(t);
    }
    wrap.appendChild(tabs);
    LEVELS.filter(L => L.c === mapCamp).forEach(L => {
      const n = U.el('button', 'node' + (L.boss ? ' boss' : '') + (L.c > 1 ? ' c' + L.c : ''));
      n.style.left = L.map[0] + 'px'; n.style.top = L.map[1] + 'px';
      n.dataset.n = L.n;
      n.addEventListener('click', () => {
        if (!Progress.isLevelUnlocked(L.n)) { Sound.play('error'); toast(`Clear level ${LEVELS[L.n - 2].label} first!`); return; }
        click(); openLevel(L);
      });
      wrap.appendChild(n);
    });
  }
  function refreshMap() {
    if (campUnlocked(2) && !Save.d.c2seen) {
      Save.d.c2seen = true; Save.save();
      mapCamp = 2; buildMap();
      setTimeout(() => { toast('New campaign unlocked: Beyond the Margin!'); Sound.play('unlock'); }, 300);
    }
    if (pendingLevel) { const L = pendingLevel; pendingLevel = null; setTimeout(() => openLevel(L), 120); }
    const front = Progress.frontier();
    $$('#map-nodes .node').forEach(n => {
      const num = +n.dataset.n, L = LEVELS[num - 1];
      const unlocked = Progress.isLevelUnlocked(num), cleared = !!Save.d.cleared[num];
      n.classList.toggle('locked', !unlocked);
      n.classList.toggle('cleared', cleared);
      n.classList.toggle('current', unlocked && !cleared && num === front);
      const st = Save.d.stars[num] || 0;
      n.innerHTML = unlocked ? `${num - CAMPAIGNS[L.c - 1].first + 1}<div class="node-stars">${STAR(st >= 1)}${STAR(st >= 2)}${STAR(st >= 3)}</div>` : `<div class="lock">${ICON.lock}</div>`;
      n.title = L.name;
    });
    const eb = $('#btn-endless');
    eb.classList.toggle('locked', !Progress.isEndlessUnlocked());
    eb.innerHTML = Progress.isEndlessUnlocked() ? `Endless Arena${Save.d.endlessBest ? ` <small>(best ${Save.d.endlessBest})</small>` : ''}` : `&#128274; Endless Arena`;
  }
  function enemyTypesOf(L) {
    if (L.endless) return ['grunt', 'runner', 'slinger', 'brute', 'boomer', 'hexer', 'knight', 'warlord', 'titan', 'shadow'];
    const list = Object.keys(L.pool);
    if (L.boss) list.push(L.boss);
    return list;
  }
  const traitsOf = def => TRAITS.filter(k => def[k] && TRAIT_INFO[k]);
  /** How well the current squad answers each gimmick. */
  function deckCheck(L, traits) {
    const defs = Progress.roster().filter(r => r.unlocked).map(r => r.def);
    const count = f => defs.filter(f).length;
    const out = [];
    const add = (icon, label, n, need, tip) => out.push({ icon, label, n, ok: n >= need, tip });
    if (traits.includes('fly')) add('\u2708', 'Anti-air', count(isAntiAir), 2, 'Ranged units and Lancers hit flyers');
    if (traits.includes('phase')) add('\u2726', 'Magic', count(isMagic), 1, 'Magic hits faded Phantoms');
    if (traits.includes('guard')) add('\u2694', 'Melee', count(d => d.range < 120 && d.dmg > 0), 3, 'Melee ignores Phalanx shields');
    if (traits.includes('plate')) add('\u{1F528}', 'Heavy hitters', count(d => d.dmg >= 45 || d.crit), 2, 'Big hits and crits punch through plating');
    if (traits.includes('split')) add('\u2735', 'Area damage', count(d => d.attack === 'area' || d.aoe || d.attack === 'bomb' || d.attack === 'magic' || d.attack === 'pierce'), 2, 'Area attacks clear split Blots');
    if (L.rules && L.rules.dark) add('\u2600', 'Light-bearers', count(d => lightOf(d) > 0), 1, 'Light lets your army see farther');
    if (L.rules && L.rules.costCap) { const over = count(d => d.cost > L.rules.costCap); out.push({ icon: '\u{1F4B0}', label: 'Over budget', n: over, ok: over === 0, tip: 'These units can\'t be summoned here', invert: true }); }
    return out;
  }
  function renderBrief(L) {
    const box = $('#lc-brief'), card = $('#level-card');
    const traits = [...new Set(enemyTypesOf(L).flatMap(id => traitsOf(ENEMIES[id])))];
    const rules = Object.keys(L.rules || {}).filter(k => RULE_INFO[k]);
    const on = !L.endless && (traits.length || rules.length || L.tip);
    card.classList.toggle('wide', !!on);
    box.classList.toggle('hidden', !on);
    if (!on) return;
    let html = '<div class="lb-title">BATTLE BRIEFING</div>';
    for (const k of rules) { const R = RULE_INFO[k]; html += `<div class="lb-row rule" style="--rc:${R.color}"><span class="lb-ic">${R.icon}</span><div><b>${R.name}</b>${R.text(L)}</div></div>`; }
    const chk = deckCheck(L, traits);
    if (chk.length) {
      html += '<div class="lb-sub">YOUR DECK <button class="lb-edit">Edit Deck &#9654;</button></div><div class="lb-check">';
      for (const c of chk) html += `<span class="lb-chip ${c.ok ? 'ok' : 'bad'}" title="${c.tip}">${c.icon} ${c.label} <b>${c.n}</b> ${c.ok ? '&#10003;' : c.invert ? '&#9888;' : '&#10007;'}</span>`;
      html += '</div>';
    }
    if (L.tip) html += `<div class="lb-tip"><b>TIP</b> ${L.tip}</div>`;
    if (traits.length) html += '<div class="lb-sub">ENEMY TRAITS</div>';
    for (const k of traits) {
      const T = TRAIT_INFO[k], who = enemyTypesOf(L).filter(id => ENEMIES[id][k]).map(id => ENEMIES[id].name).join(', ');
      html += `<div class="lb-row" style="--rc:${T.color}"><span class="lb-ic">${T.icon}</span><div><b>${T.name}</b> <small>${who}</small><br>${T.text}</div></div>`;
    }
    box.innerHTML = html;
    const ed = box.querySelector('.lb-edit');
    if (ed) ed.addEventListener('click', () => { click(); overlay('ov-level', false); pendingLevel = L; bkTab = 'deck'; show('barracks'); });
  }
  function openLevel(L) {
    currentLevel = L;
    const reg = L.endless ? 'Bonus Mode' : REGIONS.find(r => r.theme === L.theme).name;
    $('#lc-num').textContent = L.endless ? 'E' : L.label;
    $('#lc-num').classList.toggle('c2', L.c === 2);
    $('#lc-name').textContent = L.name;
    $('#lc-region').textContent = reg;
    const st = L.endless ? 0 : Save.d.stars[L.n] || 0;
    $('#lc-stars').innerHTML = L.endless ? '' : STAR(st >= 1) + STAR(st >= 2) + STAR(st >= 3);
    $('#lc-desc').textContent = L.desc;
    const en = $('#lc-enemies'); en.innerHTML = '';
    for (const type of enemyTypesOf(L)) {
      const def = ENEMIES[type];
      const box = U.el('div', 'lc-enemy' + (def.boss ? ' boss' : ''));
      const cv = U.el('canvas'); cv.width = 66; cv.height = 58;
      box.appendChild(cv); box.appendChild(document.createTextNode(def.name));
      for (const k of traitsOf(def)) { const T = TRAIT_INFO[k], tb = U.el('span', 'lc-trait', T.icon); tb.title = `${T.name}: ${T.text}`; tb.style.background = T.color; box.appendChild(tb); }
      en.appendChild(box);
      Stick.renderIcon(cv, def, 1, { w: 66, h: 58, scale: def.boss ? 0.78 : def.scale > 1.2 ? 0.88 : 0.95 });
    }
    const info = $('#lc-info'); info.innerHTML = '';
    const chip = html => info.appendChild(U.el('div', 'lc-chip', html));
    if (L.endless) {
      chip(`Best: <b>${Save.d.endlessBest || 0}</b> waves`);
      chip(`Reward: <b>30 XP</b> per wave`);
    } else {
      const first = !Save.d.cleared[L.n];
      chip(`Fortress <b>${U.fmt(L.baseHp)}</b> HP`);
      chip(`<b>${L.waves}</b> waves`);
      chip(`Reward <b>${first ? L.xp : Math.round(L.xp * 0.35)}</b> XP${first ? ' (first clear)' : ''}`);
      if (L.unlock && first) chip(`Unlocks <b style="color:#d14d00">${UNIT_BY_ID[L.unlock].name}</b>`);
    }
    renderBrief(L);
    overlay('ov-level', true);
  }

  // ---------------- barracks ----------------
  function statRow(label, now, next, fmt) {
    const f = fmt || (v => U.fmt(v));
    return `<span>${label} <b>${f(now)}</b>${next != null ? ` <span class="up">&rarr;${f(next)}</span>` : ''}</span>`;
  }
  const heroOrder = (a, b) => RARITY[b.rarity].idx - RARITY[a.rarity].idx;
  function buildBarracks() {
    const grid = $('#barracks-grid');
    grid.innerHTML = '';
    barracksCanvases = [];
    const heroes = bkTab === 'heroes';
    const list = heroes ? HEROES.filter(h => Save.d.heroes[h.id]).sort(heroOrder) : UNITS;
    grid.classList.toggle('scroll', list.length > 10);
    if (heroes && !list.length) {
      const e = U.el('div', 'bk-empty', '<b>No Stickfigures yet.</b> Summon some, then train and evolve them here.');
      const go = U.el('button', 'btn btn-summon', '<i class="tok"></i>Go to Summon');
      go.addEventListener('click', () => { click(); show('summon'); });
      e.appendChild(go); grid.appendChild(e);
      return;
    }
    for (const base of list) grid.appendChild(unitCard(base));
  }
  /** A Barracks card: stats of the chosen form, level up, evolve, Normal / Evo switch. */
  function unitCard(base) {
    const id = base.id, hero = !!base.hero;
    const unlocked = hero || Progress.isUnitUnlocked(base), lv = Evo.level(id), maxLv = hero ? HERO_MAX_LV : UNIT_MAX_LV;
    const def = unlocked ? Evo.formDef(id) : base;
    const mf = hero ? Meta.heroMult : Progress.unitMult;
    const m = mf(lv), mn = unlocked && lv < maxLv ? mf(lv + 1) : null;
    const card = U.el('div', 'ucard' + (unlocked ? '' : ' locked') + (hero ? ' hero r-' + base.rarity : '') + (def.evolved ? ' evo' : ''));
    card.style.setProperty('--c', base.color);
    card.innerHTML = `<div class="uc-top"></div>${hero ? `<span class="uc-r">${RARITY[base.rarity].id}</span>` : ''}${def.evolved ? '<span class="uc-evo">&#10022; EVO</span>' : ''}`;
    const cv = U.el('canvas'); cv.width = 220; cv.height = 92;
    card.appendChild(cv);
    const name = unlocked ? def.name : '???';
    const kind = def.attack === 'heal' ? 'Healer' : def.range > 120 ? 'Ranged' : def.attack === 'area' ? 'Area' : 'Melee';
    const body = U.el('div', null, `
      <div class="uc-name${name.length > 13 ? ' long' : ''}">${name}<span class="uc-lv">${unlocked ? 'LV ' + lv : ''}</span></div>
      <div class="uc-role">${def.role} &middot; ${kind}${unlocked ? unitTagsHtml(def) : ''}</div>
      <div class="uc-stats">
        ${statRow('HP', def.hp * m, mn ? def.hp * mn : null)}
        ${def.attack === 'heal' ? statRow('Heal', def.heal * m, mn ? def.heal * mn : null) : statRow('DMG', def.dmg * m, mn ? def.dmg * mn : null)}
        <span>Cost <b>${def.cost}</b></span><span>CD <b>${def.cd}s</b></span>
        <span>Range <b>${def.range}</b></span><span>Speed <b>${def.speed}</b></span>
      </div>`);
    card.appendChild(body);
    const rebuild = () => { buildBarracks(); refreshXP(); };
    if (!unlocked) {
      const L = Progress.unlockLevelOf(base);
      card.appendChild(U.el('div', 'uc-lockmsg', `Clear Level ${L.n}: ${L.name}`));
    } else if (Evo.isEvolved(id)) {
      const mv = def.evolved && def.evoMove;
      card.appendChild(U.el('div', 'uc-evoline', mv ? `<span style="--mc:${mv.color}">NEW MOVE</span>${mv.name}` : def.evolved ? 'Evolved form' : `Evo: ${Evo.def(id).name}`));
      card.appendChild(EvoUI.toggle(id, rebuild));
    } else if (lv >= EVO_LV) {
      card.appendChild(U.el('div', 'uc-evoline ready', `Ready to evolve into <b>${Evo.def(id).name}</b>`));
      card.appendChild(EvoUI.evolveBtn(id, rebuild));
    } else {
      const ev = Evo.def(id);
      card.appendChild(U.el('div', 'uc-evoline', `&#10022; Evolves at Lv ${EVO_LV}${ev.evoMove ? ' &middot; <b>new move!</b>' : ''}`));
      const row = U.el('div', 'uc-btns');
      const xpCost = hero ? Meta.heroXpCost(base, lv) : Progress.unitUpCost(base, lv);
      const bx = U.el('button', 'btn btn-green', `${hero ? 'Train' : 'Level up'} &middot; ${U.fmt(xpCost)} XP`);
      bx.disabled = Save.d.xp < xpCost;
      bx.addEventListener('click', () => {
        const ok = hero ? Meta.upgradeHeroXP(id) : Progress.levelUpUnit(id);
        if (!ok) return;
        Sound.play('upgrade'); rebuild(); EvoUI.afterLevelUp(id, rebuild);
      });
      row.appendChild(bx);
      if (hero) {
        const sc = Meta.heroUpCost(base, lv);
        const bs = U.el('button', 'btn btn-teal', `<i class="shard"></i>${sc}`);
        bs.title = `Level up with ${sc} Stick Shards`;
        bs.disabled = Save.d.shards < sc;
        bs.addEventListener('click', () => { if (Meta.upgradeHero(id)) { Sound.play('upgrade'); rebuild(); EvoUI.afterLevelUp(id, rebuild); } });
        row.appendChild(bs);
      }
      card.appendChild(row);
    }
    barracksCanvases.push({ cv, def, unlocked });
    return card;
  }
  // ---------------- deck editor (barracks) ----------------
  function setBkTab(tab) {
    bkTab = tab;
    $$('.bk-tab').forEach(b => b.classList.toggle('active', b.dataset.bk === tab));
    $('#barracks-grid').classList.toggle('hidden', tab === 'deck');
    $('#deck-view').classList.toggle('hidden', tab !== 'deck');
    if (tab === 'deck') buildDeck(); else buildBarracks();
  }
  const unitDef = id => HERO_BY_ID[id] || UNIT_BY_ID[id];
  const isLocked = def => !def.hero && !Progress.isUnitUnlocked(def);
  /** The form (Normal or Evo) a unit fights in. */
  const formOf = id => (isLocked(unitDef(id)) ? unitDef(id) : Evo.formDef(id));
  function deckCard(def, cls, extra) {
    const locked = isLocked(def);
    const el = U.el('button', `dk-card ${cls}${def.hero ? ' hero r-' + def.rarity : ''}${locked ? ' locked' : ''}`);
    el.style.setProperty('--c', def.color);
    const tag = def.hero ? `<span class="dk-r">${RARITY[def.rarity].id}</span>` : '';
    el.innerHTML = `${extra || ''}${tag}${def.exclusive ? '<span class="dk-ex">EXCLUSIVE</span>' : ''}${EvoUI.badge(def)}<canvas></canvas>
      <div class="dk-name">${locked ? '???' : def.short}</div>
      <div class="dk-cost">${locked ? `<small>Level ${def.unlock}</small>` : `<i class="coin"></i>${def.cost}`}</div>`;
    Stick.renderIcon(el.querySelector('canvas'), def, 0, { w: 96, h: 70, scale: 0.88 });
    return el;
  }
  function buildDeck() {
    const sq = Meta.squad();
    const slotsEl = $('#deck-slots'); slotsEl.innerHTML = '';
    sq.forEach((id, i) => {
      const def = formOf(id);
      const el = deckCard(def, 'slot-card' + (dkSel && dkSel.slot === i ? ' sel' : '') + (dkSel && dkSel.id ? ' target' : ''), `<span class="dk-key">${(i + 1) % 10}</span>`);
      el.addEventListener('click', () => deckClick({ slot: i }));
      slotsEl.appendChild(el);
    });
    const pool = $('#deck-pool'); pool.innerHTML = '';
    const owned = [...UNITS, ...HEROES.filter(h => Save.d.heroes[h.id]).sort((a, b) => RARITY[b.rarity].idx - RARITY[a.rarity].idx)];
    for (const b0 of owned) {
      const def = formOf(b0.id), inDeck = sq.indexOf(def.id);
      const el = deckCard(def, 'pool-card' + (dkSel && dkSel.id === def.id ? ' sel' : '') + (inDeck >= 0 ? ' indeck' : ''),
        inDeck >= 0 ? `<span class="dk-in">IN DECK &middot; ${(inDeck + 1) % 10}</span>` : '');
      el.addEventListener('click', () => deckClick({ id: def.id }));
      pool.appendChild(el);
    }
    const heroes = HEROES.filter(h => Save.d.heroes[h.id]).length;
    $('#dk-count').textContent = `${UNITS.filter(u => Progress.isUnitUnlocked(u)).length} regular units · ${heroes}/${HEROES.length} Stickfigures`;
    renderDeckInfo();
  }
  function deckClick(pick) {
    const sq = Meta.squad();
    if (pick.id) {
      const def = unitDef(pick.id);
      if (isLocked(def)) { Sound.play('error'); toast(`Clear Level ${def.unlock} to unlock ${def.name}`); return; }
      if (dkSel && dkSel.slot != null) { place(pick.id, dkSel.slot); return; }
      dkSel = dkSel && dkSel.id === pick.id ? null : pick;
    } else {
      if (dkSel && dkSel.id) { place(dkSel.id, pick.slot); return; }
      if (dkSel && dkSel.slot != null && dkSel.slot !== pick.slot) { place(sq[dkSel.slot], pick.slot); return; }
      dkSel = dkSel && dkSel.slot === pick.slot ? null : pick;
    }
    click();
    buildDeck();
  }
  function place(id, slot) {
    const before = Meta.squad()[slot];
    if (Meta.equip(id, slot)) {
      Sound.play('summon', 0);
      if (before !== id && !Meta.squad().includes(before)) toast(`${unitDef(id).short} replaced ${unitDef(before).short}`);
    }
    dkSel = null;
    buildDeck();
  }
  function renderDeckInfo() {
    const box = $('#deck-info');
    const id = dkSel ? dkSel.id || Meta.squad()[dkSel.slot] : null;
    if (!id) {
      box.className = '';
      box.innerHTML = '<b>Tap a unit</b> then a deck slot to swap it in &mdash; or tap two deck slots to reorder them. Summoned Stickfigures fight alongside your regular units.';
      return;
    }
    const def = formOf(id), lv = Evo.level(id);
    const m = def.hero ? Meta.heroMult(lv) : Progress.unitMult(lv);
    box.className = def.hero ? 'r-' + def.rarity : '';
    box.innerHTML = `<div class="di-name">${def.name}${EvoUI.badge(def)}${unitTagsHtml(def)} <small>${def.hero ? RARITY[def.rarity].name + ' · ' : ''}${def.role} · Lv ${lv}</small></div>
      <div class="di-ab">${def.ability || def.desc}${def.evoMove ? `<br><b style="color:${def.evoMove.color}">&#10022; ${def.evoMove.desc}</b>` : ''}</div>
      <div class="di-stats">HP <b>${U.fmt(def.hp * m)}</b> · ${def.attack === 'heal' ? 'Heal' : 'DMG'} <b>${U.fmt((def.attack === 'heal' ? def.heal : def.dmg) * m)}</b> · Range <b>${def.range}</b> · Cost <b>${def.cost}</b> · CD <b>${def.cd}s</b></div>
      <div class="di-hint">${dkSel.id ? 'Now tap a deck slot to place it.' : 'Tap a unit below to swap it into this slot, or another slot to swap places.'}</div>`;
  }

  function animateBarracks(t) {
    if (bkTab === 'deck') return;
    for (const c of barracksCanvases) {
      const def = c.def;
      Stick.renderIcon(c.cv, def, 0, { w: 220, h: 92, scale: def.scale > 1.5 ? 0.86 : 0.92, t, mode: c.unlocked ? 'anim' : 'idle' });
    }
  }

  // ---------------- lab ----------------
  function buildLab() {
    const list = $('#lab-list');
    list.innerHTML = '';
    for (const up of LAB) {
      const lv = Progress.labLv(up.id), cost = Progress.labCost(up, lv), maxed = lv >= up.max;
      const row = U.el('div', 'lab-row');
      let pips = '';
      for (let i = 0; i < up.max; i++) pips += `<div class="lab-pip${i < lv ? ' on' : ''}"></div>`;
      row.innerHTML = `
        <div class="lab-ico" style="background:${up.color}">${ICON[up.icon]}</div>
        <div class="lab-main"><div class="lab-name">${up.name}</div><div class="lab-desc">${up.desc}</div><div class="lab-pips">${pips}</div></div>
        <div class="lab-val">${up.val(lv)}${maxed ? '' : ` <span class="arrow">&rarr; ${up.val(lv + 1)}</span>`}</div>`;
      const btn = U.el('button', 'btn btn-yellow', maxed ? 'MAXED' : `${U.fmt(cost)} XP`);
      btn.disabled = maxed || Save.d.xp < cost;
      btn.addEventListener('click', () => {
        if (maxed || Save.d.xp < cost) return;
        Save.d.xp -= cost; Save.d.lab[up.id] = lv + 1; Save.save();
        Sound.play('upgrade'); buildLab(); refreshXP();
      });
      row.appendChild(btn);
      list.appendChild(row);
    }
  }

  // ---------------- battle ----------------
  function startBattle(L) {
    overlay('ov-level', false); overlay('ov-result', false); overlay('ov-pause', false);
    const b = new Battle(L, { roster: Progress.roster(), mods: Progress.mods(), shake: Save.d.settings.shake, autoCam: Save.d.settings.autocam });
    Game.battle = b;
    Game.level = L;
    buildSlots(b);
    resetHud(b);
    show('battle');
    tip = L.n === 1 && !Save.d.tutorial ? { step: 0, t: 0 } : null;
    $('#tip').classList.add('hidden');
    banner(L.name, 'gold', L.endless ? 'Survive as long as you can!' : `Level ${L.label}${L.rules ? ' · ' + Object.keys(L.rules).map(k => RULE_INFO[k].name).join(' · ') : ''}`);
  }
  function buildSlots(b) {
    const wrap = $('#slots');
    wrap.innerHTML = '';
    slots = [];
    Progress.roster().forEach((entry, i) => {
      const def = entry.def;
      const r = b.rosterById[def.id];
      const el = U.el('button', 'slot' + (r ? '' : ' locked') + (def.hero ? ` hero r-${def.rarity}` : '') + (def.evolved ? ' evo' : ''));
      el.style.setProperty('--c', def.color);
      el.innerHTML = `<div class="band"></div><span class="key">${(i + 1) % 10}</span><canvas width="76" height="66"></canvas>
        ${def.evolved ? '<span class="evo-star">&#10022;</span>' : ''}<span class="nm">${r ? def.short : '???'}</span><span class="cost">${r ? `<i class="coin"></i>${def.cost}` : '&nbsp;'}</span>
        ${r ? '<div class="cdov"></div><div class="cdt"></div>' : `<div class="lk">${ICON.lock}</div>`}`;
      Stick.renderIcon(el.querySelector('canvas'), def, 0, { w: 76, h: 66, scale: def.scale > 1.5 ? 0.8 : 0.9 });
      if (r && b.rules.costCap && def.cost > b.rules.costCap) { el.classList.add('banned'); el.insertAdjacentHTML('beforeend', '<div class="ban">OVER<br>BUDGET</div>'); }
      const s = { el, def, unlocked: !!r, cdov: el.querySelector('.cdov'), cdt: el.querySelector('.cdt'), last: {} };
      el.addEventListener('pointerdown', e => { e.preventDefault(); trySummon(s); });
      wrap.appendChild(el);
      slots.push(s);
    });
  }
  function trySummon(s) {
    const b = Game.battle;
    if (!b || b.paused) return;
    if (!s.unlocked) { Sound.play('error'); toast(`Clear Level ${s.def.unlock} to unlock`); return; }
    const res = b.summon(s.def.id);
    if (res === 'ok') {
      s.el.classList.remove('pop'); void s.el.offsetWidth; s.el.classList.add('pop');
    } else {
      s.el.classList.remove('deny'); void s.el.offsetWidth; s.el.classList.add('deny');
      Sound.play('error', 0.1);
      if (res === 'gold') toast('Not enough gold!');
      else if (res === 'cooldown') toast('Still recharging...');
      else if (res === 'cap') toast('Army is full!');
      else if (res === 'army') toast(`Army limit: only ${b.rules.unitCap} stickmen at once!`);
      else if (res === 'banned') toast(`Over budget: only units costing ${b.rules.costCap} or less`);
    }
  }
  function tryWallet() {
    const b = Game.battle; if (!b || b.paused) return;
    const res = b.upgradeWallet();
    const btn = $('#btn-wallet');
    if (res === 'ok') { btn.classList.remove('flash'); void btn.offsetWidth; btn.classList.add('flash'); }
    else if (res === 'gold') { Sound.play('error', 0.1); toast('Not enough gold!'); }
    else if (res === 'max') toast('Wallet is maxed out!');
  }
  function tryThunder() {
    const b = Game.battle; if (!b || b.paused) return;
    if (!b.fireThunder()) { Sound.play('error', 0.15); if (b.state === 'play') toast(`Thunder charging... ${Math.floor(b.thunder * 100)}%`); }
    else if (tip && tip.step === 2) advanceTip();
  }
  function togglePause(force) {
    const b = Game.battle; if (!b || b.state === 'end') return;
    b.paused = force != null ? force : !b.paused;
    $('#pause-level').textContent = b.L.endless ? `Endless Arena · Wave ${b.waveIdx}` : `Level ${b.L.label} · ${b.L.name}`;
    overlay('ov-pause', b.paused);
  }
  function toggleSpeed() {
    const b = Game.battle; if (!b) return;
    b.speed = b.speed === 1 ? 2 : 1;
    const e = $('#btn-speed');
    e.textContent = b.speed + 'x'; e.classList.toggle('fast', b.speed === 2);
    click();
  }

  function resetHud(b) {
    hud = {
      gold: $('#gold-n'), goldMax: $('#gold-max'), rate: $('#gold-rate'), wlv: $('#wallet-lv'), wcost: $('#wallet-cost'), wbtn: $('#btn-wallet'),
      wcw: $('#wallet-cost-wrap'),
      hpYou: $('#hp-you'), hpYouN: $('#hp-you-n'), hpEn: $('#hp-enemy'), hpEnN: $('#hp-enemy-n'), enLabel: $('#enemy-label'),
      wave: $('#wave-label'), waveFill: $('#wave-fill'), thBtn: $('#btn-thunder'), thRing: $('#btn-thunder .th-ring'), thPct: $('#th-pct'),
      boss: $('#bossbar'), bossName: $('#boss-name'), bossFill: $('#boss-fill'), mm: $('#minimap'), last: {},
    };
    const mm = hud.mm, dpr = Math.min(2, window.devicePixelRatio || 1);
    mm.width = 380 * dpr; mm.height = 26 * dpr;
    hud.mmCtx = mm.getContext('2d'); hud.mmCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hud.boss.classList.add('hidden');
    const sp = $('#btn-speed'); sp.textContent = '1x'; sp.classList.remove('fast');
    hud.enLabel.textContent = b.endless ? 'ENEMY PORTAL' : 'ENEMY FORTRESS';
    hud.rules = $('#rule-hud'); hud.rules.innerHTML = '';
  }
  function ruleHud(b) {
    return b.ruleStatus().map(r => {
      if (r.id === 'wind') return r.state === 'calm'
        ? `<span class="rh wind">${RULE_INFO.wind.icon} ${r.next === 'tail' ? 'Tailwind' : 'Headwind'} in ${r.t}s</span>`
        : `<span class="rh wind ${r.state}">${r.state === 'tail' ? '&#9654;&#9654; TAILWIND' : '&#9664;&#9664; HEADWIND'} ${r.t}s</span>`;
      if (r.id === 'generators') return r.left ? `<span class="rh gen">&#9889; Generators ${r.left}/${r.total}</span>` : '<span class="rh gen down">&#9889; Shield down!</span>';
      if (r.id === 'unitCap') return `<span class="rh cap${r.n >= r.cap ? ' full' : ''}">${RULE_INFO.unitCap.icon} Army ${r.n}/${r.cap}</span>`;
      if (r.id === 'costCap') return `<span class="rh budget">${RULE_INFO.costCap.icon} Budget ${r.cap}</span>`;
      if (r.id === 'dark') return r.lift ? '<span class="rh dark lit">&#9728; Lit up!</span>' : `<span class="rh dark">${RULE_INFO.dark.icon} Darkness</span>`;
      return '';
    }).join('');
  }
  function set(key, val, fn) { if (hud.last[key] !== val) { hud.last[key] = val; fn(val); } }

  function updateHud(b, dt) {
    // events from the battle
    while (b.events.length) {
      const e = b.events.shift();
      if (e.type === 'banner') banner(e.text, e.cls, e.small);
      else if (e.type === 'boss') { hud.bossName.textContent = e.name; hud.last.boss = null; }
      else if (e.type === 'end') onBattleEnd(b);
      else if (e.type === 'baseDestroyed') {
        Sound.stopMusic();
        setTimeout(() => Sound.play(e.result === 'win' ? 'victory' : 'defeat'), 700);
        banner(e.result === 'win' ? (b.endless ? 'GAME OVER' : 'VICTORY!') : b.endless ? 'GAME OVER' : 'DEFEAT...', e.result === 'win' ? 'gold' : 'red');
        $('#tip').classList.add('hidden'); tip = null;
      }
    }
    set('gold', Math.floor(b.gold), v => (hud.gold.textContent = U.fmt(v)));
    set('gmax', b.walletMax(), v => (hud.goldMax.textContent = U.fmt(v)));
    set('rate', Math.round(b.walletRate()), v => (hud.rate.textContent = v));
    set('wlv', b.walletLv, v => (hud.wlv.textContent = v >= WALLET_MAX_LV ? 'MAX' : v));
    const wc = b.walletCost();
    set('wcost', wc, v => { hud.wcost.textContent = isFinite(v) ? U.fmt(v) : 'MAXED'; hud.wbtn.classList.toggle('maxed', !isFinite(v)); });
    set('wpoor', isFinite(wc) && b.gold < wc, v => hud.wbtn.classList.toggle('poor', v));

    for (const s of slots) {
      if (!s.unlocked) continue;
      const cdMax = s.def.cd * b.mods.cdMult, cd = b.cd[s.def.id] || 0;
      const frac = cd > 0 ? cd / cdMax : 0;
      const pct = Math.round(frac * 100);
      if (s.last.pct !== pct) { s.last.pct = pct; s.cdov.style.height = pct + '%'; }
      const txt = cd > 0 ? (cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)) : '';
      if (s.last.txt !== txt) { s.last.txt = txt; s.cdt.textContent = txt; }
      const poor = b.gold < s.def.cost;
      if (s.last.poor !== poor) { s.last.poor = poor; s.el.classList.toggle('poor', poor); }
      const ready = cd <= 0;
      if (ready && s.last.ready === false && !poor) { s.el.classList.remove('pop'); void s.el.offsetWidth; s.el.classList.add('pop'); }
      s.last.ready = ready;
    }

    const th = b.thunder;
    set('th', Math.floor(th * 100), v => { hud.thRing.style.setProperty('--p', v / 100); hud.thPct.textContent = v >= 100 ? 'READY!' : v + '%'; hud.thBtn.classList.toggle('ready', v >= 100); });

    const py = b.pBase, en = b.eBase;
    set('hpy', Math.ceil(py.hp), v => { hud.hpYou.style.width = (100 * Math.max(0, v)) / py.maxHp + '%'; hud.hpYouN.textContent = `${U.fmt(Math.max(0, v))} / ${U.fmt(py.maxHp)}`; });
    if (b.endless) set('hpe', 'inf', () => { hud.hpEn.style.width = '100%'; hud.hpEnN.textContent = 'INVULNERABLE'; });
    else set('hpe', Math.ceil(en.hp), v => { hud.hpEn.style.width = (100 * Math.max(0, v)) / en.maxHp + '%'; hud.hpEnN.textContent = `${U.fmt(Math.max(0, v))} / ${U.fmt(en.maxHp)}`; });

    const wl = b.endless ? `WAVE ${Math.max(1, b.waveIdx)}` : b.waveIdx >= b.totalWaves ? `FINAL WAVE ${b.totalWaves}/${b.totalWaves}` : `WAVE ${Math.max(1, b.waveIdx)}/${b.totalWaves}`;
    set('wave', wl, v => { hud.wave.textContent = v; hud.wave.classList.toggle('final', !b.endless && b.waveIdx >= b.totalWaves); });
    const wf = b.state === 'intro' ? 0 : Math.round(100 * U.clamp(1 - b.waveTimer / b.waveLen, 0, 1));
    set('wf', wf, v => (hud.waveFill.style.width = v + '%'));

    const bossAlive = !!(b.boss && b.boss.alive);
    set('bossVis', bossAlive, v => hud.boss.classList.toggle('hidden', !v));
    if (bossAlive) set('boss', Math.ceil(b.boss.hp), v => (hud.bossFill.style.width = (100 * v) / b.boss.maxHp + '%'));
    b.renderMinimap(hud.mmCtx, 380, 26);
    set('rules', ruleHud(b), v => (hud.rules.innerHTML = v));
    if (tip) updateTip(b, dt);
  }

  // ---------------- tutorial ----------------
  const TIPS = [
    { text: 'Tap a unit card (or press <kbd>1</kbd>) to summon a <b>Stickling</b>!', anchor: () => slots[0] && slots[0].el },
    { text: 'Gold refills over time. Upgrade your <b>Wallet</b> (<kbd>Q</kbd>) to earn faster!', anchor: () => $('#btn-wallet') },
    { text: '<b>Thunder</b> is charged! Tap it (<kbd>Space</kbd>) to blast nearby enemies.', anchor: () => $('#btn-thunder') },
    { text: 'Destroy the enemy fortress to win! Drag the battlefield or use the minimap to look around.', anchor: null },
  ];
  function showTip(i) {
    const el = $('#tip'), T = TIPS[i];
    el.innerHTML = T.text; el.classList.remove('hidden');
    const a = T.anchor && T.anchor();
    let ax = 50;
    if (a) {
      const ui = $('#ui').getBoundingClientRect(), r = a.getBoundingClientRect(), k = ui.width / 1280;
      const cx = (r.left + r.width / 2 - ui.left) / k;
      const tw = el.offsetWidth, left = U.clamp(cx, tw / 2 + 10, 1280 - tw / 2 - 10);
      el.style.left = left + 'px';
      ax = U.clamp(((cx - (left - tw / 2)) / tw) * 100, 6, 94);
    } else el.style.left = '50%';
    el.style.setProperty('--ax', ax + '%');
    el.style.setProperty('display', a ? '' : '');
    el.classList.toggle('noarrow', !a);
  }
  function advanceTip() { if (!tip) return; tip.step++; tip.t = 0; tip.shown = false; if (tip.step >= TIPS.length) { $('#tip').classList.add('hidden'); tip = null; } }
  function updateTip(b, dt) {
    if (b.state !== 'play') return;
    tip.t += dt;
    const s = tip.step;
    if (s === 0) { if (!tip.shown) { showTip(0); tip.shown = true; } if (b.stats.summoned > 0) advanceTip(); }
    else if (s === 1) {
      if (!tip.shown && tip.t > 2.5) { showTip(1); tip.shown = true; }
      if (b.walletLv > 1 || tip.t > 14) advanceTip();
    } else if (s === 2) {
      if (b.thunder >= 1 && !tip.shown) { showTip(2); tip.shown = true; tip.t = 0; }
      else if (!tip.shown) { tip.t = 0; $('#tip').classList.add('hidden'); }
      if (tip.shown && tip.t > 12) advanceTip();
    } else if (s === 3) {
      if (!tip.shown) { showTip(3); tip.shown = true; }
      if (tip.t > 7) advanceTip();
    }
  }

  // ---------------- results ----------------
  function onBattleEnd(b) {
    const L = b.L, S = Save.d;
    const card = $('.result-card');
    b._prevStars = S.stars[L.n] || 0; b._first = !L.endless && !S.cleared[L.n];
    let xp = 0, stars = 0, unlock = null, note = '';
    const win = b.result === 'win';
    if (L.n === 1) S.tutorial = true;
    if (b.endless) {
      const survived = Math.max(0, b.waveIdx - 1);
      xp = survived * 30 + Math.round(b.stats.kills * 0.5);
      if (survived > (S.endlessBest || 0)) { S.endlessBest = survived; note = 'New best!'; }
      $('#res-title').textContent = 'GAME OVER';
      card.classList.add('lose');
      $('#res-stars').innerHTML = `<div style="font-family:var(--display);font-size:42px">${survived} WAVES SURVIVED</div>`;
    } else if (win) {
      const frac = b.pBase.hp / b.pBase.maxHp;
      stars = Progress.starsFor(frac);
      const first = !S.cleared[L.n];
      xp = first ? L.xp : Math.round(L.xp * 0.35);
      const prev = S.stars[L.n] || 0;
      if (stars > prev) { xp += (stars - prev) * Math.round(L.xp * 0.1); S.stars[L.n] = stars; }
      S.cleared[L.n] = true;
      if (first && L.unlock) unlock = UNIT_BY_ID[L.unlock];
      note = first ? 'First clear bonus!' : 'Replay reward';
      $('#res-title').textContent = 'VICTORY!';
      card.classList.remove('lose');
      $('#res-stars').innerHTML = STAR(0) + STAR(0) + STAR(0);
      $$('#res-stars .star').forEach((e, i) => {
        if (i < stars) setTimeout(() => { e.classList.add('on', 'pop'); Sound.play('star', 0); }, 450 + i * 330);
        else setTimeout(() => e.classList.add('pop'), 450 + i * 330);
      });
    } else {
      const frac = 1 - Math.max(0, b.eBase.hp) / b.eBase.maxHp;
      xp = 10 + Math.round(L.xp * 0.25 * frac);
      note = 'Consolation XP for damage dealt';
      $('#res-title').textContent = 'DEFEAT';
      card.classList.add('lose');
      $('#res-stars').innerHTML = '<div style="font-weight:900;font-size:20px;padding-top:20px">Your tower has fallen... upgrade your army and try again!</div>';
    }
    S.xp += xp;
    Save.save();
    const tokens = Meta.battleTokens(b, { win, first: b._first, stars, newStars: Math.max(0, stars - b._prevStars), survived: b.endless ? Math.max(0, b.waveIdx - 1) : 0 });

    const mins = Math.floor(b.stats.time / 60), secs = Math.floor(b.stats.time % 60);
    $('#res-stats').innerHTML = [
      ['Time', `${mins}:${String(secs).padStart(2, '0')}`], ['Summoned', b.stats.summoned], ['Defeated', b.stats.kills], ['Damage', U.fmt(b.stats.dmgDealt)],
    ].map(([k, v]) => `<div class="res-stat">${k}<b>${v}</b></div>`).join('');
    $('#res-reward').innerHTML = `+${U.fmt(xp)} XP${tokens ? ` <span class="res-tok"><i class="tok big"></i>+${U.fmt(tokens)}</span>` : ''}${note ? `<small>${note}</small>` : ''}`;
    MetaUI.refresh();
    setTimeout(() => MetaUI.achPopups(), 1200);
    const ru = $('#res-unlock');
    ru.classList.toggle('hidden', !unlock);
    if (unlock) {
      $('#res-unlock-name').textContent = unlock.name;
      $('#res-unlock-desc').textContent = unlock.desc;
      Stick.renderIcon($('#res-unlock-cv'), unlock, 0, { w: 160, h: 140, scale: unlock.scale > 1.5 ? 0.85 : 1 });
      setTimeout(() => Sound.play('unlock'), 1500);
    }
    const next = !L.endless && win && LEVELS[L.n];
    $('#btn-res-next').classList.toggle('hidden', !next);
    $('#btn-res-retry').textContent = L.endless ? 'Play Again' : win ? 'Replay' : 'Retry';
    overlay('ov-result', true);
    refreshXP();
  }

  function endBattle() {
    if (Game.battle) Meta.creditBattle(Game.battle);
    Game.battle = null;
    overlay('ov-result', false); overlay('ov-pause', false);
    $('#tip').classList.add('hidden'); tip = null;
  }

  // ---------------- settings ----------------
  function syncSettings() {
    const s = Save.d.settings;
    $('#set-sfx').checked = s.sfx; $('#set-music').checked = s.music; $('#set-shake').checked = s.shake; $('#set-autocam').checked = s.autocam;
    Sound.setSfx(s.sfx); Sound.setMusic(s.music);
    if (Game.battle) { Game.battle.shakeOn = s.shake; Game.battle.autoCam = s.autocam; }
  }

  // ---------------- input ----------------
  function bindInput() {
    const canvas = $('#view');
    let drag = null;
    canvas.addEventListener('pointerdown', e => {
      const b = Game.battle;
      if (Game.screen !== 'battle' || !b) return;
      if (b.state === 'intro') { b.skipIntro(); return; }
      drag = { x: e.clientX, t: performance.now(), v: 0 };
      b.dragging = true; b.camV = 0; b.touchCam();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    });
    canvas.addEventListener('pointermove', e => {
      const b = Game.battle;
      if (!drag || !b) return;
      const k = Game.scale, dx = (e.clientX - drag.x) / k, now = performance.now();
      const dtm = Math.max(1, now - drag.t);
      b.camX = U.clamp(b.camX - dx, 0, Math.max(0, b.W - VIEW_W)); b.touchCam();
      drag.v = U.lerp(drag.v, (-dx / dtm) * 1000, 0.5);
      drag.x = e.clientX; drag.t = now;
    });
    const up = () => {
      const b = Game.battle;
      if (drag && b) { b.dragging = false; b.camV = performance.now() - drag.t < 80 ? drag.v : 0; }
      drag = null;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => {
      const b = Game.battle; if (!b || Game.screen !== 'battle') return;
      e.preventDefault();
      b.camV = 0; b.touchCam();
      b.camX = U.clamp(b.camX + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 1.2, 0, Math.max(0, b.W - VIEW_W));
    }, { passive: false });

    const mm = $('#minimap');
    let mmDrag = false;
    const mmMove = e => {
      const b = Game.battle; if (!b) return;
      const r = mm.getBoundingClientRect();
      const fx = U.clamp((e.clientX - r.left) / r.width, 0, 1);
      b.camV = 0; b.touchCam();
      b.camX = U.clamp(fx * b.W - VIEW_W / 2, 0, Math.max(0, b.W - VIEW_W));
    };
    mm.addEventListener('pointerdown', e => { mmDrag = true; try { mm.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } mmMove(e); });
    mm.addEventListener('pointermove', e => { if (mmDrag) mmMove(e); });
    mm.addEventListener('pointerup', () => (mmDrag = false));

    window.addEventListener('keydown', e => {
      const b = Game.battle;
      if (e.repeat && !['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) return;
      if (e.key === 'Escape') {
        if ($('#ov-settings').classList.contains('show')) { overlay('ov-settings', false); return; }
        if ($('#ov-howto').classList.contains('show')) { overlay('ov-howto', false); return; }
        if ($('#ov-level').classList.contains('show')) { overlay('ov-level', false); return; }
      }
      if (Game.screen !== 'battle' || !b) return;
      const k = e.key.toLowerCase();
      if (k === 'p' || k === 'escape') { togglePause(); e.preventDefault(); return; }
      if (b.paused || $('#ov-result').classList.contains('show')) return;
      if (/^[0-9]$/.test(k)) { const i = k === '0' ? 9 : +k - 1; if (slots[i]) trySummon(slots[i]); }
      else if (k === 'q' || k === 'w') tryWallet();
      else if (k === ' ' || k === 'e') { tryThunder(); e.preventDefault(); }
      else if (k === 'f') toggleSpeed();
      else if (k === 'a' || k === 'arrowleft') b.input.left = true;
      else if (k === 'd' || k === 'arrowright') b.input.right = true;
    });
    window.addEventListener('keyup', e => {
      const b = Game.battle; if (!b) return;
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') b.input.left = false;
      if (k === 'd' || k === 'arrowright') b.input.right = false;
    });
    document.addEventListener('visibilitychange', () => {
      const b = Game.battle;
      if (document.hidden && b && Game.screen === 'battle' && !b.paused && b.state !== 'end') togglePause(true);
    });
  }

  // ---------------- wiring ----------------
  function bind() {
    // first gesture unlocks audio
    const unlock = () => { Sound.init(); syncSettings(); };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });

    $$('[data-go]').forEach(b => b.addEventListener('click', () => { click(); show(b.dataset.go); }));
    $$('[data-close]').forEach(b => b.addEventListener('click', () => { click(); b.closest('.overlay').classList.remove('show'); }));
    $$('.overlay').forEach(o => o.addEventListener('pointerdown', e => {
      if (e.target === o && o.id !== 'ov-result' && o.id !== 'ov-pause' && o.id !== 'ov-confirm') o.classList.remove('show');
    }));

    $('#btn-play').addEventListener('click', () => { click(); show('map'); });
    $('#btn-howto').addEventListener('click', () => { click(); overlay('ov-howto', true); });
    const openSettings = () => { click(); syncSettings(); overlay('ov-settings', true); };
    $('#btn-settings-title').addEventListener('click', openSettings);
    $('#btn-settings-map').addEventListener('click', openSettings);
    $('#btn-settings-pause').addEventListener('click', openSettings);
    $('#btn-fullscreen').addEventListener('click', () => {
      click();
      const el = document.documentElement;
      if (document.fullscreenElement) document.exitFullscreen && document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    });
    $('#btn-rotate-ok').addEventListener('click', () => document.body.classList.add('rotate-ok'));

    $('#btn-barracks').addEventListener('click', () => { click(); show('barracks'); });
    $('#btn-lab').addEventListener('click', () => { click(); show('lab'); });
    $$('.bk-tab').forEach(b => b.addEventListener('click', () => { click(); dkSel = null; setBkTab(b.dataset.bk); }));
    $('#btn-dk-reset').addEventListener('click', () => { click(); Meta.resetSquad(); dkSel = null; buildDeck(); });
    $('#btn-dk-summon').addEventListener('click', () => { click(); show('summon'); });
    $('#btn-endless').addEventListener('click', () => {
      if (!Progress.isEndlessUnlocked()) { Sound.play('error'); toast(`Clear level ${ENDLESS.unlockAfter} to unlock!`); return; }
      click(); openLevel(ENDLESS);
    });
    $('#btn-go').addEventListener('click', () => { click(); if (currentLevel) startBattle(currentLevel); });

    $('#btn-pause').addEventListener('click', () => { click(); togglePause(); });
    $('#btn-speed').addEventListener('click', toggleSpeed);
    $('#btn-wallet').addEventListener('pointerdown', e => { e.preventDefault(); tryWallet(); });
    $('#btn-thunder').addEventListener('pointerdown', e => { e.preventDefault(); tryThunder(); });
    $('#btn-resume').addEventListener('click', () => { click(); togglePause(false); });
    $('#btn-restart').addEventListener('click', () => { click(); const L = Game.level; endBattle(); startBattle(L); });
    $('#btn-quit').addEventListener('click', () => { click(); endBattle(); show('map'); });

    $('#btn-res-map').addEventListener('click', () => { click(); endBattle(); show('map'); });
    $('#btn-res-retry').addEventListener('click', () => { click(); const L = Game.level; endBattle(); startBattle(L); });
    $('#btn-res-next').addEventListener('click', () => {
      click();
      const next = LEVELS[Game.level.n];
      endBattle();
      if (next) startBattle(next); else show('map');
    });

    $('#set-sfx').addEventListener('change', e => { Save.d.settings.sfx = e.target.checked; Save.save(); syncSettings(); click(); });
    $('#set-music').addEventListener('change', e => { Save.d.settings.music = e.target.checked; Save.save(); syncSettings(); });
    $('#set-shake').addEventListener('change', e => { Save.d.settings.shake = e.target.checked; Save.save(); syncSettings(); });
    $('#set-autocam').addEventListener('change', e => { Save.d.settings.autocam = e.target.checked; Save.save(); syncSettings(); });
    $('#btn-reset').addEventListener('click', () => {
      confirmBox('Reset progress?', 'All XP, unlocked units, upgrades and stars will be lost forever.', () => {
        Save.reset(); Meta.ensure(); syncSettings(); overlay('ov-settings', false);
        endBattle(); show('title'); toast('Progress reset');
      });
    });

    bindInput();
  }

  function init() {
    buildMap();
    bind();
    syncSettings();
    show('title');
  }

  /** Per-frame UI work. */
  function tick(dt, t) {
    if (Game.screen === 'battle' && Game.battle) updateHud(Game.battle, dt);
    else if (Game.screen === 'barracks') animateBarracks(t);
    MetaUI.tick(dt, t);
    EvoUI.tick(dt, t);
  }

  return { init, tick, show, toast, startBattle, overlay, togglePause, openLevel };
})();
