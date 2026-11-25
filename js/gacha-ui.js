'use strict';
/* =========================================================
   UI for the meta systems: Stick Token display, daily
   rewards, quests & achievements, banner/summon screen with
   the summon reveal animation, and the collection screen
   with the battle-squad editor.
   ========================================================= */

const MetaUI = (() => {
  const $ = U.$, $$ = U.$$;
  const DISPLAY = '"Luckiest Guy", Impact, sans-serif';
  const starStr = n => '&#9733;'.repeat(n);
  const rar = h => RARITY[h.rarity];

  let selBanner = 'standard', bannerPeriod = null, timerAcc = 0;
  let colFilter = 'all', colSel = null, pickMode = false, detailCv = null;
  let anim = null, lastPull = null;
  let dailyShownFor = null, qTab = 'daily';

  // ---------- helpers ----------
  function fitCanvas(cv, w, h) {
    const k = U.clamp(Game.k || 1, 1, 2.5);
    const W = Math.round(w * k), H = Math.round(h * k);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(k, 0, 0, k, 0, 0);
    return ctx;
  }
  function fmtTime(ms) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${String(m).padStart(2, '0')}m`;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
    return `${m}m ${String(sec).padStart(2, '0')}s`;
  }
  const previewScale = (h, base) => base / Math.max(1, Math.pow(h.scale || 1, 0.6));
  function wrap(ctx, text, x, y, maxW, lh, maxLines) {
    const words = text.split(' ');
    let line = '', lines = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y + lines * lh); lines++; line = words[i];
        if (lines >= maxLines - 1) { line = words.slice(i).join(' '); break; }
      } else line = test;
    }
    if (line) ctx.fillText(line, x, y + lines * lh);
  }
  function outlined(ctx, s, x, y, size, fill, stroke = '#2b2118') {
    ctx.font = `${size}px ${DISPLAY}`;
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.2); ctx.strokeStyle = stroke;
    ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y);
  }

  // ---------- currency display ----------
  function refresh() {
    const s = Save.d;
    $$('.tok-n').forEach(e => (e.textContent = U.fmt(s.tokens || 0)));
    $$('.shard-n').forEach(e => (e.textContent = U.fmt(s.shards || 0)));
    const c = Meta.claimableCount();
    const setBadge = (el, n, txt) => { if (!el) return; el.classList.toggle('hidden', !n); el.textContent = txt || n; };
    setBadge($('#badge-daily'), c.daily, '!');
    setBadge($('#badge-quests'), c.quests + c.ach);
    setBadge($('#badge-tab-q'), c.quests);
    setBadge($('#badge-tab-a'), c.ach);
    if (Game.screen === 'summon') updateBannerInfo();
  }
  /** Floating "+N" from the token counter. */
  function gain(n) {
    if (!n) return;
    Sound.play('coin', 0);
    const pill = $$('.tok-pill').find(p => p.offsetParent !== null);
    const ui = $('#ui'), k = ui.getBoundingClientRect().width / 1280;
    const el = U.el('div', 'tok-gain', `+${U.fmt(n)}`);
    if (pill) {
      const r = pill.getBoundingClientRect(), u = ui.getBoundingClientRect();
      el.style.left = (r.left - u.left) / k + 10 + 'px'; el.style.top = (r.bottom - u.top) / k + 4 + 'px';
    } else { el.style.left = '600px'; el.style.top = '90px'; }
    ui.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
  function achPopups() {
    if (anim) { setTimeout(achPopups, 1500); return; }
    const list = Meta.newAchievements();
    list.forEach((a, i) => setTimeout(() => {
      const el = U.el('div', 'ach-pop', `<div class="ap-ico">&#127942;</div><div><div class="ap-t">Achievement complete!</div><div class="ap-n">${a.name}</div><div class="ap-r">Claim <i class="tok"></i>${a.reward} in Quests</div></div>`);
      $('#ach-stack').appendChild(el);
      Sound.play('unlock', 0);
      setTimeout(() => el.remove(), 3800);
    }, 600 + i * 700));
    if (list.length) refresh();
  }

  // ---------- daily rewards ----------
  function openDaily(welcome) {
    const st = Meta.dailyState();
    $('#daily-welcome').classList.toggle('hidden', !welcome);
    const row = $('#daily-row'); row.innerHTML = '';
    DAILY_REWARDS.forEach((amt, i) => {
      const day = i + 1;
      const done = st.claimable ? day < st.day : day <= st.day;
      const today = st.claimable && day === st.day;
      const box = U.el('div', 'daily-box' + (done ? ' done' : '') + (today ? ' today' : '') + (day === 7 ? ' big' : ''),
        `<div class="db-day">DAY ${day}</div><i class="tok ${day === 7 ? 'huge' : 'big'}"></i><div class="db-amt">${amt}</div>${done ? '<div class="db-check">&#10004;</div>' : ''}`);
      row.appendChild(box);
    });
    const btn = $('#btn-claim-daily');
    btn.disabled = !st.claimable;
    btn.textContent = st.claimable ? `CLAIM +${DAILY_REWARDS[st.day - 1]}` : 'CLAIMED';
    $('#daily-sub').textContent = st.claimable ? `Day ${st.day} of your login streak. Miss a day and it starts over!`
      : `Come back in ${fmtTime(Meta.msToNextDay())} for day ${(st.day % 7) + 1}.`;
    UI.overlay('ov-daily', true);
  }
  function claimDaily() {
    const n = Meta.claimDaily();
    if (!n) return;
    Sound.play('upgrade');
    gain(n);
    const t = $('#daily-row .today');
    if (t) { t.classList.add('done', 'claimed-pop'); t.insertAdjacentHTML('beforeend', '<div class="db-check">&#10004;</div>'); }
    const btn = $('#btn-claim-daily'); btn.disabled = true; btn.textContent = 'CLAIMED';
    refresh();
    setTimeout(() => UI.overlay('ov-daily', false), 1300);
  }

  // ---------- quests & achievements ----------
  function openQuests(tab) { qTab = tab || qTab; renderQuests(); UI.overlay('ov-quests', true); }
  function row(text, sub, prog, goal, reward, state, onClaim) {
    const el = U.el('div', 'q-row' + (state === 'claimed' ? ' claimed' : state === 'ready' ? ' ready' : ''));
    el.innerHTML = `<div class="q-main"><div class="q-text">${text}</div>${sub ? `<div class="q-sub">${sub}</div>` : ''}
      <div class="q-bar"><div style="width:${Math.round((100 * prog) / goal)}%"></div><span>${U.fmt(prog)} / ${U.fmt(goal)}</span></div></div>
      <div class="q-rew"><i class="tok big"></i>${reward}</div>`;
    const b = U.el('button', 'btn btn-small ' + (state === 'ready' ? 'btn-yellow' : ''), state === 'claimed' ? '&#10004; Done' : state === 'ready' ? 'Claim' : 'In progress');
    b.disabled = state !== 'ready';
    b.addEventListener('click', () => { const n = onClaim(); if (n) { gain(n); Sound.play('upgrade'); renderQuests(); refresh(); } });
    el.appendChild(b);
    return el;
  }
  function renderQuests() {
    $$('#ov-quests .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === qTab));
    const list = $('#q-list'); list.innerHTML = '';
    if (qTab === 'daily') {
      $('#q-reset').textContent = `New quests in ${fmtTime(Meta.msToNextDay())}`;
      for (const it of Meta.questList()) list.appendChild(row(it.q.text, null, it.prog, it.q.goal, it.q.reward, it.claimed ? 'claimed' : it.done ? 'ready' : 'todo', () => Meta.claimQuest(it.q.id)));
      const bs = Meta.bonusState();
      const done = Meta.questList().filter(x => x.claimed).length;
      list.appendChild(row('&#11088; Daily bonus', 'Claim all three quests', done, 3, QUEST_BONUS, bs.claimed ? 'claimed' : bs.ready ? 'ready' : 'todo', () => Meta.claimBonus()));
    } else {
      const items = Meta.achList();
      $('#q-reset').textContent = `${items.filter(x => x.claimed).length} / ${items.length} achievements claimed`;
      items.sort((a, b) => (b.done && !b.claimed) - (a.done && !a.claimed) || a.claimed - b.claimed);
      for (const it of items) list.appendChild(row(it.a.name, it.a.text, it.prog, it.a.goal, it.a.reward, it.claimed ? 'claimed' : it.done ? 'ready' : 'todo', () => Meta.claimAch(it.a.id)));
    }
  }

  // ---------- summon screen ----------
  function buildSummon() {
    const act = Meta.activeBanners();
    bannerPeriod = act.period;
    if (!act.list.some(x => x.banner.id === selBanner)) selBanner = 'standard';
    const tabs = $('#banner-tabs'); tabs.innerHTML = '';
    for (const { banner, ends, season } of act.list) {
      const t = U.el('button', 'bn-tab' + (banner.id === selBanner ? ' active' : '') + (banner.zodiac ? ' zodiac' : ''));
      t.style.setProperty('--c1', banner.colors[0]); t.style.setProperty('--c2', banner.colors[1]);
      const time = season ? `<div class="bt-time" data-season="${season.nextAt}">${season.sign.name} season · ${fmtTime(season.nextAt - Meta.now())}</div>`
        : `<div class="bt-time" data-ends="${ends || ''}">${ends ? fmtTime(ends - Meta.now()) : 'Always available'}</div>`;
      t.innerHTML = `<canvas width="70" height="70"></canvas><div><div class="bt-tag">${banner.zodiac ? ZArt.glyphSVG(season.sign.id, '#fde68a', 13) + ' ' : ''}${banner.tag}</div><div class="bt-name">${banner.name}</div>${time}</div>`;
      Stick.renderIcon(t.querySelector('canvas'), HERO_BY_ID[banner.featured[0]], 0, { w: 70, h: 70, scale: 0.85 });
      t.addEventListener('click', () => { selBanner = banner.id; Sound.play('click', 0); buildSummon(); });
      tabs.appendChild(t);
    }
    const nx = act.next;
    const soon = U.el('div', 'bn-soon');
    soon.innerHTML = `<div class="bt-tag">COMING NEXT</div><div class="bt-name">${nx.banner.name}</div><div class="bt-time" data-starts="${nx.starts}">Starts in ${fmtTime(nx.starts - Meta.now())}</div>`;
    tabs.appendChild(soon);
    updateBannerInfo();
  }
  function curBanner() { return Meta.activeBanners().list.find(x => x.banner.id === selBanner) || Meta.activeBanners().list[0]; }
  const seasonTimer = season => `<span>${season.sign.name.toUpperCase()} SEASON ENDS IN</span> ${fmtTime(season.nextAt - Meta.now())}`;
  function updateBannerInfo() {
    const { banner, ends, season } = curBanner();
    $('#bn-tag').textContent = banner.tag;
    $('#bn-tag').classList.toggle('limited', !banner.permanent);
    $('#bn-tag').classList.toggle('zodiac', !!banner.zodiac);
    $('#bn-name').textContent = banner.name;
    $('#bn-desc').textContent = banner.desc;
    $('#bn-timer').innerHTML = season ? seasonTimer(season) : ends ? `<span>ENDS IN</span> ${fmtTime(ends - Meta.now())}` : '<span>PERMANENT</span> banner';
    const f = $('#bn-featured'); f.innerHTML = '';
    for (const id of banner.featured) {
      const h = HERO_BY_ID[id], r = rar(h);
      f.appendChild(U.el('div', 'bf-chip', `<span class="bf-r" style="background:${r.color}">${r.id}</span>${h.zodiac ? ZArt.glyphSVG(h.zodiac, '#b45309', 16) : ''}${h.name}${banner.zodiac ? '<em class="z">SIGN OF THE SEASON</em>' : h.limited ? '<em>LIMITED</em>' : ''}`));
    }
    if (banner.zodiac) {
      const have = ZODIAC_HEROES.filter(h => Save.d.heroes[h.id]).length;
      f.appendChild(U.el('div', 'bf-chip', `<span class="bf-r" style="background:${RARITY.UR.color}">UR</span>All 12 Zodiacs &middot; ${have}/12 collected`));
    }
    const tok = Save.d.tokens || 0;
    $('#btn-pull1 .pc b').textContent = GACHA.single; $('#btn-pull10 .pc b').textContent = GACHA.multi;
    $('#btn-pull1').classList.toggle('poor', tok < GACHA.single);
    $('#btn-pull10').classList.toggle('poor', tok < GACHA.multi);
    $('#sb-pity').innerHTML = `Ultra Rare or better guaranteed within <b>${Meta.pityLeft()}</b> summons${Meta.purityNear() ? '<div class="sb-pure">&#10022; Something pure stirs in the void...</div>' : ''}`;
  }
  function tickSummon(t, dt) {
    const cv = $('#banner-cv');
    const ctx = fitCanvas(cv, 990, 390);
    const { banner } = curBanner();
    drawBannerArt(ctx, banner, t, 990, 390);
    timerAcc += dt;
    if (timerAcc > 0.5) {
      timerAcc = 0;
      if (Meta.activeBanners().period !== bannerPeriod) { buildSummon(); return; }
      $$('#banner-tabs [data-ends]').forEach(e => { if (e.dataset.ends) e.textContent = fmtTime(+e.dataset.ends - Meta.now()); });
      $$('#banner-tabs [data-starts]').forEach(e => (e.textContent = 'Starts in ' + fmtTime(+e.dataset.starts - Meta.now())));
      $$('#banner-tabs [data-season]').forEach(e => (e.textContent = `${zodiacSeason(Meta.now()).sign.name} season · ${fmtTime(+e.dataset.season - Meta.now())}`));
      const { ends, season } = curBanner();
      if (season) $('#bn-timer').innerHTML = seasonTimer(season);
      else if (ends) $('#bn-timer').innerHTML = `<span>ENDS IN</span> ${fmtTime(ends - Meta.now())}`;
    }
  }
  function drawZodiacBanner(ctx, t, W, H) {
    const season = zodiacSeason(Meta.now()), z = season.sign, idx = ZODIAC.indexOf(z);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#02030f'); g.addColorStop(1, '#312e81');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(t * 1.3 + i)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc((i * 173.3) % W, (i * 71.7) % H, (i % 3) * 0.6 + 0.6, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    ZArt.drawWheel(ctx, 760, 210, 300, -idx * TAU / 12 + Math.sin(t * 0.3) * 0.08, idx, t, 0.3);
    ctx.globalAlpha = 0.8; ZArt.drawConstellation(ctx, z.id, 560, 30, 400, 250, 1, z.color, t); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(470, 0); ctx.lineTo(380, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    const prev = ZODIAC_HEROES[(idx + 11) % 12], next = ZODIAC_HEROES[(idx + 1) % 12];
    for (const [h, x, y, s0] of [[prev, 560, 350, 2.2], [next, 930, 352, 2.2], [season.hero, 765, 340, 3.4]]) {
      ZArt.glow(ctx, x, y, 90 * s0 / 3, h === season.hero ? '#fde68a' : '#93c5fd', 0.55);
      Stick.drawPreview(ctx, h, 0, x, y, previewScale(h, s0), t + x, h === season.hero ? 'anim' : 'idle', -1);
    }
    ZArt.drawGlyph(ctx, z.id, 900, 70, 64, '#fde68a', 9);
  }
  function drawBannerArt(ctx, banner, t, W, H) {
    if (banner.zodiac) { drawZodiacBanner(ctx, t, W, H); return; }
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, banner.colors[0]); g.addColorStop(1, banner.colors[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // rotating light rays
    ctx.save(); ctx.translate(W * 0.7, H * 0.55); ctx.rotate(t * 0.12);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    for (let i = 0; i < 14; i++) { ctx.rotate(TAU / 14); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -70); ctx.lineTo(900, 70); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // diagonal stripes on the left
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(470, 0); ctx.lineTo(380, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    // sparkles
    for (let i = 0; i < 26; i++) {
      const x = (i * 211.7) % W, y = (i * 97.3 + t * 12 * (1 + (i % 3))) % H;
      ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * 2 + i));
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, H - y, 1.5 + (i % 3), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // featured stickfigures
    const f = banner.featured.map(id => HERO_BY_ID[id]);
    const spots = f.length >= 3 ? [[760, 330, 3.3], [575, 345, 2.4], [920, 350, 2.1]] : [[770, 335, 3.5], [560, 350, 2.5]];
    for (let i = f.length - 1; i >= 0; i--) {
      const h = f[i], [x, y, s0] = spots[i] || spots[spots.length - 1];
      const r = rar(h), s = previewScale(h, s0);
      const pg = ctx.createRadialGradient(x, y, 4, x, y, 110 * s0 / 3);
      pg.addColorStop(0, r.glow); pg.addColorStop(1, r.glow + '00');
      ctx.globalAlpha = 0.55; ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(x, y, 110 * s0 / 3, 30 * s0 / 3, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      Stick.drawPreview(ctx, h, 0, x, y, s, t + i * 0.7, 'anim', -1);
    }
  }
  function openRates() {
    const { banner } = curBanner();
    $('#rates-title').textContent = banner.name;
    const pool = Meta.bannerPool(banner);
    let html = `<div class="rt-note">1 summon = <i class="tok"></i>${GACHA.single} &middot; 10 summons = <i class="tok"></i>${GACHA.multi} (Major Rare or better guaranteed) &middot; Ultra Rare or better guaranteed every ${GACHA.pity} summons.</div>`;
    const rates = Meta.ratesOf(banner);
    if (banner.zodiac) html += `<div class="rt-note">Every Ultra Rare from this banner is one of the 12 Zodiacs. The sign of the season (${zodiacSeason(Meta.now()).sign.name}) makes up ${Math.round(banner.featuredChance * 100)}% of them.</div>`;
    if (!banner.permanent) html += `<div class="rt-note">Featured Stickfigures make up ${Math.round(GACHA.featuredChance * 100)}% of pulls of their rarity. Limited ones can only be summoned while this banner is live.</div>`;
    for (const r of [...RARITIES].reverse()) {
      const list = pool.filter(h => h.rarity === r.id && (banner.exclusiveRarity !== r.id || h.limited === banner.id));
      const rate = rates[RARITY[r.id].idx];
      const names = r.id === 'P'
        ? `<span class="pure">??? &middot; ${list.filter(h => Save.d.heroes[h.id]).length} of ${list.length} discovered</span>`
        : list.map(h => `<span class="${banner.featured.includes(h.id) && (!banner.permanent || banner.zodiac) ? 'feat' : ''}">${h.name}${h.limited ? ' &#9733;' : ''}</span>`).join('');
      html += `<div class="rt-row r-${r.id}"><div class="rt-r" style="background:${r.color}">${r.name}<b>${rate}%</b></div><div class="rt-list">${names}</div></div>`;
    }
    html += `<div class="rt-note">Duplicates turn into Stick Shards: ${RARITIES.map(r => `${r.name} ${r.shards}`).join(' &middot; ')}.</div>`;
    $('#rates-body').innerHTML = html;
    UI.overlay('ov-rates', true);
  }
  function doPull(count, bannerId) {
    const id = bannerId || selBanner;
    const res = Meta.pull(id, count);
    if (!res.ok) {
      Sound.play('error');
      if (res.reason === 'tokens') UI.toast(`Need ${res.cost} Stick Tokens - try quests & daily rewards!`);
      else { UI.toast('That banner has ended!'); buildSummon(); }
      return false;
    }
    lastPull = { count, bannerId: id };
    startAnim(res.results);
    return true;
  }

  // ---------- summon animation ----------
  /* Each result plays one of three sequences: 'charge' (orb), 'zodiac' (wheel,
     constellation, glyph) or 'charge' -> 'void' for Purities. */
  const Z_MARKS = [2.55, 3.7, 4.6];
  const phaseFor = res => (res.hero.zodiac ? 'zodiac' : 'charge');
  function makeSky() {
    const out = [];
    for (let i = 0; i < 160; i++) out.push({ x: Math.random() * 1280, y: Math.random() * 720, r: Math.random() * 1.6 + 0.4, ph: Math.random() * TAU });
    return out;
  }
  function startAnim(results) {
    anim = { results, i: -1, parts: [], sky: makeSky(), dur: results.length > 1 ? 1.25 : 1.7 };
    $('#pull-summary').classList.add('hidden');
    $('#btn-pull-skip').classList.toggle('hidden', results.length < 2);
    UI.overlay('ov-pull', true);
    beginResult();
  }
  function beginResult() {
    anim.i++;
    const cur = anim.results[anim.i];
    Object.assign(anim, { t: 0, phase: phaseFor(cur), hint: 0, rings: [], flash: 0, flashCol: '#ffffff', shake: 0, lastSeg: -1, starsShown: 0, glyphPlayed: false, shattered: false });
    $('#pull-hint').classList.add('hidden');
    Sound.play(anim.phase === 'zodiac' ? 'zstar' : 'gcharge', 0);
  }
  function nextReveal() {
    if (!anim) return;
    if (anim.phase === 'charge') { anim.t = anim.dur; return; }
    if (anim.phase === 'zodiac') { anim.t = Z_MARKS.find(m => m > anim.t + 0.05) || Z_MARKS[2]; return; }
    if (anim.phase === 'void') { anim.t = Math.max(anim.t, anim.t < 1.3 ? 1.3 : 1.85); return; }
    if (anim.phase === 'reveal' && anim.t < 0.35) return;
    if (anim.phase !== 'reveal') return;
    if (anim.i + 1 >= anim.results.length) { showSummary(); return; }
    beginResult();
  }
  function showSummary() {
    anim.phase = 'summary';
    $('#pull-hint').classList.add('hidden');
    $('#btn-pull-skip').classList.add('hidden');
    const grid = $('#ps-grid'); grid.innerHTML = '';
    grid.classList.toggle('single', anim.results.length === 1);
    anim.results.forEach((r, i) => {
      const h = r.hero, R = rar(h);
      const c = U.el('div', `ps-card r-${h.rarity}`);
      c.style.animationDelay = i * 0.07 + 's';
      c.innerHTML = `${r.isNew ? '<div class="ps-new">NEW!</div>' : ''}${h.zodiac ? `<div class="ps-z">${ZArt.glyphSVG(h.zodiac, '#fde68a', 24)}</div>` : ''}<canvas></canvas><div class="ps-stars" style="color:${R.color}">${starStr(R.stars)}</div><div class="ps-name">${h.name}</div>
        <div class="ps-sub">${r.isNew ? R.name : `+${r.shards} shards`}</div>`;
      grid.appendChild(c);
      Stick.renderIcon(c.querySelector('canvas'), h, 0, { w: 110, h: 92, scale: 0.95 });
    });
    $('#btn-ps-again').innerHTML = `Again x${lastPull.count} &middot; <i class="tok"></i>${lastPull.count === 10 ? GACHA.multi : GACHA.single}`;
    $('#pull-summary').classList.remove('hidden');
    refresh();
  }
  function closeAnim() {
    anim = null;
    UI.overlay('ov-pull', false);
    refresh();
    achPopups();
    if (Game.screen === 'collection') buildCollection();
  }
  function partSpawn(p) { if (anim.parts.length < 500) anim.parts.push(p); }

  function tickAnim(dt, T) {
    const A = anim, cv = $('#pull-cv'), ctx = fitCanvas(cv, 1280, 720);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cur = A.results[Math.min(A.i, A.results.length - 1)];
    const rIdx = cur.rIdx;
    A.t += dt;
    if (A.phase === 'zodiac') {
      if (A.t >= Z_MARKS[2]) toReveal(A, cur);
    } else if (A.phase === 'void') {
      if (A.t >= 1.85) toReveal(A, cur);
    } else if (A.phase === 'charge') {
      const th = [0.3, 0.5, 0.66, 0.8].map(f => f * A.dur);
      let hint = 0; for (let i = 0; i < 4; i++) if (A.t >= th[i] && i < rIdx) hint = i + 1;
      if (hint > A.hint) { A.hint = hint; A.flash = 0.35; A.shake = 4 + hint * 3; Sound.play('ghint', 0); A.rings.push({ t: 0, c: RARITIES[hint].color }); }
      for (let k = 0; k < 4; k++) {
        const a = Math.random() * TAU, d = 380 + Math.random() * 120;
        partSpawn({ x: 640 + Math.cos(a) * d, y: 330 + Math.sin(a) * d, a, d, sp: 260 + Math.random() * 200, life: 2, t: 0, kind: 'in', c: Math.random() < 0.5 ? '#ffffff' : RARITIES[A.hint].color });
      }
      if (A.t >= A.dur) {
        if (rIdx === 4) { A.phase = 'void'; A.t = 0; Sound.play('gpurity', 0); }
        else toReveal(A, cur);
      }
    }
    const shown = A.phase === 'charge' ? A.hint : rIdx;
    const col = RARITIES[shown].color;
    const starry = A.phase === 'zodiac' || (A.phase === 'reveal' && cur.hero.zodiac);
    // background
    const sx = A.shake ? (Math.random() * 2 - 1) * A.shake : 0, sy = A.shake ? (Math.random() * 2 - 1) * A.shake : 0;
    A.shake *= Math.exp(-dt * 6);
    const bg = ctx.createRadialGradient(640, 330, 20, 640, 330, 800);
    bg.addColorStop(0, A.phase === 'summary' ? '#1a1235' : col + '55'); bg.addColorStop(0.45, '#130b2a'); bg.addColorStop(1, '#05030c');
    ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, 1280, 720);
    if (starry) drawStarSky(ctx, A, T, ZODIAC_BY_ID[cur.hero.zodiac].color);
    else ctx.fillStyle = bg, ctx.fillRect(0, 0, 1280, 720);
    ctx.save(); ctx.translate(sx, sy);
    if (A.phase === 'zodiac') drawZodiacSequence(ctx, A, cur, T);
    // rays
    if ((A.phase === 'reveal' && rIdx >= 1) || (A.phase === 'charge' && A.hint >= 1) || A.phase === 'summary') {
      ctx.save(); ctx.translate(640, 330); ctx.rotate(T * 0.25);
      const nR = 18;
      for (let i = 0; i < nR; i++) {
        ctx.rotate(TAU / nR);
        ctx.fillStyle = rIdx === 4 && A.phase === 'reveal' ? `hsla(${(i * 40 + T * 120) % 360},90%,65%,.16)` : (A.phase === 'summary' ? '#ffffff' : col) + (starry ? '18' : '22');
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1000, -60); ctx.lineTo(1000, 60); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // particles
    for (const p of A.parts) {
      p.t += dt;
      if (p.kind === 'in') {
        p.d -= p.sp * dt; p.a += dt * 1.6;
        p.x = 640 + Math.cos(p.a) * p.d; p.y = 330 + Math.sin(p.a) * p.d;
        if (p.d < 30) p.t = p.life;
        ctx.globalAlpha = Math.min(1, p.d / 200); ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, TAU); ctx.fill();
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.kind === 'shard' ? 60 : 420) * dt; p.vx *= 0.985; p.rot += dt * 8;
        ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
        ctx.fillStyle = p.hue != null ? `hsl(${(p.hue + T * 200) % 360},95%,70%)` : p.c;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        if (p.kind === 'starp') ZArt.star4(ctx, 0, 0, 6, ctx.fillStyle);
        else if (p.kind === 'shard') { ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); }
        else ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    A.parts = A.parts.filter(p => p.t < p.life);
    // shockwave rings
    for (const r of A.rings) {
      r.t += dt;
      if (r.t < 0 || r.t > 0.8) continue;
      ctx.globalAlpha = 1 - r.t / 0.8; ctx.strokeStyle = r.c; ctx.lineWidth = 10 * (1 - r.t / 0.8) + 2;
      ctx.beginPath(); ctx.arc(640, 330, 40 + U.easeOut(r.t / 0.8) * 520, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (A.phase === 'charge') drawOrb(ctx, A, col, T);
    else if (A.phase === 'reveal') drawCard(ctx, cur, A.t, T);
    ctx.restore();
    if (A.phase === 'void') drawVoid(ctx, A, T);
    if (A.flash > 0) {
      ctx.globalAlpha = Math.min(1, A.flash); ctx.fillStyle = A.flashCol || '#ffffff'; ctx.fillRect(0, 0, 1280, 720); ctx.globalAlpha = 1;
      A.flash = Math.max(0, A.flash - dt * 2.4);
    }
  }
  function toReveal(A, cur) {
    const rIdx = cur.rIdx, zod = !!cur.hero.zodiac, pure = rIdx === 4;
    A.phase = 'reveal'; A.t = 0; A.flash = 1; A.shake = 6 + rIdx * 4;
    A.flashCol = zod ? '#fde68a' : '#ffffff';
    A.rings.push({ t: 0, c: zod ? '#fbbf24' : RARITIES[rIdx].color }, { t: -0.12, c: '#ffffff' });
    const n = 50 + rIdx * 25 + (zod ? 30 : 0);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU, v = 200 + Math.random() * (500 + rIdx * 150);
      partSpawn({ x: 640, y: 330, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, life: 1.2 + Math.random() * 0.8, t: 0, rot: Math.random() * 6,
        kind: zod && k % 3 === 0 ? 'starp' : 'conf', hue: pure ? Math.random() * 360 : null,
        c: zod ? (Math.random() < 0.6 ? '#fbbf24' : '#ffffff') : Math.random() < 0.6 ? RARITIES[rIdx].color : '#ffffff' });
    }
    Sound.play('greveal' + rIdx, 0);
    if (cur.isNew && rIdx >= 2) setTimeout(() => Sound.play('unlock', 0), 350);
    setTimeout(() => { if (anim && anim.phase === 'reveal') $('#pull-hint').classList.remove('hidden'); }, 500);
    $('#pull-hint').textContent = anim.results.length > 1 ? `Tap to continue (${anim.i + 1}/${anim.results.length})` : 'Tap to continue';
  }
  function drawStarSky(ctx, A, T, tint) {
    const g = ctx.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, '#02030f'); g.addColorStop(0.6, '#0b1033'); g.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    for (const [x, y, r, c] of [[300, 200, 380, '#4c1d95'], [1000, 480, 420, '#1e3a8a'], [640, 330, 300, tint]]) {
      const n = ctx.createRadialGradient(x, y, 0, x, y, r);
      n.addColorStop(0, c + '44'); n.addColorStop(1, c + '00');
      ctx.fillStyle = n; ctx.fillRect(0, 0, 1280, 720);
    }
    const fade = A.phase === 'zodiac' ? Math.min(1, A.t / 0.6) : 1;
    for (const st of A.sky) {
      ctx.globalAlpha = fade * (0.35 + 0.65 * Math.abs(Math.sin(T * 1.5 + st.ph)));
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  /** Wheel spins and stops on the sign -> constellation -> glyph. */
  function drawZodiacSequence(ctx, A, cur, T) {
    const z = ZODIAC_BY_ID[cur.hero.zodiac], idx = ZODIAC.indexOf(z), t = A.t;
    // 1. the great wheel
    const spin = U.clamp((t - 0.25) / 1.8, 0, 1), target = -idx * TAU / 12;
    const rot = target - (1 - U.easeOutCubic(spin)) * TAU * 3.25;
    const seg = ((Math.round(-rot / (TAU / 12)) % 12) + 12) % 12;
    if (seg !== A.lastSeg && spin < 1) { A.lastSeg = seg; Sound.play('zwheel', 0.025); }
    const fadeOut = U.clamp((t - 2.55) / 0.7, 0, 1);
    const wScale = U.easeOutBack(U.clamp(t / 0.5, 0, 1)) * (1 - fadeOut * 0.2);
    ctx.save(); ctx.translate(640, 330); ctx.scale(wScale, wScale);
    ZArt.drawWheel(ctx, 0, 0, 250, rot, spin >= 1 ? idx : -1, T, 1 - fadeOut * 0.78);
    ctx.restore();
    if (spin < 1 || fadeOut < 1) {
      ctx.globalAlpha = 1 - fadeOut;
      ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(624, 330 - 262 * wScale - 26); ctx.lineTo(656, 330 - 262 * wScale - 26); ctx.lineTo(640, 330 - 262 * wScale + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (spin >= 1 && t < 2.9) { ctx.globalAlpha = 1 - U.clamp((t - 2.55) / 0.35, 0, 1); outlined(ctx, z.name.toUpperCase(), 640, 640, 44, '#ffffff'); outlined(ctx, z.element.toUpperCase() + ' SIGN', 640, 682, 20, z.color); ctx.globalAlpha = 1; }
    // 2. constellation
    if (t > 2.5) {
      const prog = U.clamp((t - 2.55) / 1.15, 0, 1);
      const shown = Math.floor(U.clamp(prog * 2, 0, 1) * z.stars.length);
      if (shown > A.starsShown) { A.starsShown = shown; Sound.play('zstar', 0.05); }
      ctx.globalAlpha = t > 3.65 ? 0.55 : 1;
      ZArt.drawConstellation(ctx, z.id, 380, 140, 520, 360, prog, z.color, T);
      ctx.globalAlpha = 1;
    }
    // 3. the zodiac symbol
    if (t > 3.65) {
      if (!A.glyphPlayed) { A.glyphPlayed = true; Sound.play('zglyph', 0); A.shake = 4; }
      const gp = U.clamp((t - 3.7) / 0.6, 0, 1);
      ZArt.glow(ctx, 640, 320, 260 * gp, z.color, 0.7);
      ZArt.drawGlyph(ctx, z.id, 640, 320, 230, '#ffffff', 10, gp);
      ZArt.drawGlyph(ctx, z.id, 640, 320, 230, z.color, 5, gp);
      ctx.globalAlpha = gp;
      outlined(ctx, z.name.toUpperCase(), 640, 520, 54, '#ffffff');
      outlined(ctx, z.title.toUpperCase(), 640, 570, 26, '#fde68a');
      ctx.globalAlpha = 1;
    }
  }
  /** Purity: everything falls into a black void, a pinpoint of light, then a prismatic shatter. */
  function drawVoid(ctx, A, T) {
    const t = A.t;
    ctx.globalAlpha = U.clamp(t / 0.4, 0, 1); ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 1280, 720); ctx.globalAlpha = 1;
    if (t > 0.45 && t < 1.3) {
      const g = U.clamp((t - 0.45) / 0.55, 0, 1), r = t < 1.0 ? 2 + g * 8 + Math.sin(T * 20) * 1.5 : 10 + Math.pow((t - 1.0) / 0.3, 3) * 900;
      ZArt.glow(ctx, 640, 330, r * 4, '#ffffff', 0.5);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(640, 330, r, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.08; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, (T * 400 + i * 130) % 720, 1280, 2); }
      ctx.globalAlpha = 1;
    }
    if (t >= 1.3) {
      if (!A.shattered) {
        A.shattered = true; A.shake = 14;
        for (let k = 0; k < 90; k++) {
          const a = Math.random() * TAU, v = 300 + Math.random() * 700;
          partSpawn({ x: 640, y: 330, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.5, t: 0, kind: 'shard', rot: Math.random() * 6, hue: Math.random() * 360 });
        }
      }
      const k = (t - 1.3) / 0.55;
      ctx.save(); ctx.translate(640, 330); ctx.rotate(T * 0.6);
      for (let i = 0; i < 24; i++) { ctx.rotate(TAU / 24); ctx.fillStyle = `hsla(${(i * 15 + T * 200) % 360},95%,65%,${0.25 * (1 - k * 0.5)})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1100, -40); ctx.lineTo(1100, 40); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const j = Math.random() < 0.3 ? (Math.random() - 0.5) * 16 : 0;
      for (const [dx, c] of [[-5 + j, '#ff0055'], [5 - j, '#00e5ff'], [0, '#ffffff']]) {
        ctx.font = `110px ${DISPLAY}`; ctx.fillStyle = c; ctx.globalAlpha = 0.85; ctx.fillText('PURITY', 640 + dx, 330);
      }
      ctx.restore();
    }
  }
  function drawOrb(ctx, A, col, T) {
    const k = A.t / A.dur;
    const r = 34 + k * 26 + Math.sin(T * 18) * 3 * (1 + A.hint);
    const halo = ctx.createRadialGradient(640, 330, r * 0.5, 640, 330, r * 3.2);
    halo.addColorStop(0, col + 'aa'); halo.addColorStop(1, col + '00');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(640, 330, r * 3.2, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(630, 318, 2, 640, 330, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#ffffff'); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(640, 330, r, 0, TAU); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#2b2118'; ctx.stroke();
    // ink stickman silhouette swirling inside the orb
    ctx.save(); ctx.translate(640, 330); ctx.rotate(Math.sin(T * 3) * 0.2);
    ctx.strokeStyle = 'rgba(30,20,40,.55)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    const h = r * 0.55;
    ctx.beginPath(); ctx.arc(0, -h * 0.55, h * 0.22, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -h * 0.33); ctx.lineTo(0, h * 0.25); ctx.moveTo(-h * 0.35, -h * 0.1); ctx.lineTo(h * 0.35, -h * 0.2);
    ctx.moveTo(0, h * 0.25); ctx.lineTo(-h * 0.25, h * 0.65); ctx.moveTo(0, h * 0.25); ctx.lineTo(h * 0.25, h * 0.65); ctx.stroke();
    ctx.restore();
    // cracks as it is about to burst
    if (k > 0.7) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
      const rng = U.rng(A.i + 7);
      for (let i = 0; i < 6; i++) {
        const a = rng() * TAU; let x = 640, y = 330;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let s = 0; s < 3; s++) { x += Math.cos(a + (rng() - 0.5)) * r * 0.4 * (k - 0.6) * 3; y += Math.sin(a + (rng() - 0.5)) * r * 0.4 * (k - 0.6) * 3; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }
    outlined(ctx, 'SUMMONING...', 640, 560, 34, '#ffffff');
  }
  function rrect(ctx, x, y, w, h, r) { U.rrect(ctx, x, y, w, h, r); }
  function drawCard(ctx, res, t, T) {
    const h = res.hero, R = rar(h), legend = R.idx === 4, gold = R.idx === 3;
    const sc = U.easeOutBack(Math.min(1, t / 0.45));
    const W = 420, H = 520;
    ctx.save(); ctx.translate(640, 345); ctx.scale(sc, sc);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // glow + frame
    const frame = legend ? (() => { const g = ctx.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2); for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(i * 60 + T * 140) % 360},95%,62%)`); return g; })() : R.color;
    for (const [lw, a] of [[30, 0.12], [18, 0.22]]) { ctx.globalAlpha = a; ctx.strokeStyle = frame; ctx.lineWidth = lw; rrect(ctx, -W / 2, -H / 2, W, H, 26); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const bg = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
    bg.addColorStop(0, '#2a1f4a'); bg.addColorStop(1, '#120c22');
    rrect(ctx, -W / 2, -H / 2, W, H, 26); ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = frame; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#2b2118'; rrect(ctx, -W / 2 - 4, -H / 2 - 4, W + 8, H + 8, 29); ctx.stroke();
    // art window
    const z = h.zodiac ? ZODIAC_BY_ID[h.zodiac] : null;
    ctx.save();
    rrect(ctx, -W / 2 + 22, -H / 2 + 70, W - 44, 250, 16); ctx.clip();
    if (z) {
      const sg = ctx.createLinearGradient(0, -H / 2 + 70, 0, -H / 2 + 320);
      sg.addColorStop(0, '#050817'); sg.addColorStop(1, '#312e81');
      ctx.fillStyle = sg; ctx.fillRect(-W / 2, -H / 2 + 60, W, 270);
      ctx.globalAlpha = 0.5; ZArt.drawConstellation(ctx, z.id, -W / 2 + 40, -H / 2 + 85, W - 80, 200, 1, z.color, T); ctx.globalAlpha = 1;
    } else if (legend) {
      ctx.fillStyle = '#05010d'; ctx.fillRect(-W / 2, -H / 2 + 60, W, 270);
      ctx.save(); ctx.translate(0, -H / 2 + 200); ctx.rotate(T * 0.4);
      for (let i = 0; i < 16; i++) { ctx.rotate(TAU / 16); ctx.fillStyle = `hsla(${(i * 22 + T * 120) % 360},95%,65%,.22)`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(320, -26); ctx.lineTo(320, 26); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    } else {
      const ag = ctx.createRadialGradient(0, -H / 2 + 230, 10, 0, -H / 2 + 200, 260);
      ag.addColorStop(0, R.glow); ag.addColorStop(0.5, R.color + '88'); ag.addColorStop(1, '#1b1433');
      ctx.fillStyle = ag; ctx.fillRect(-W / 2, -H / 2 + 60, W, 270);
    }
    ctx.save(); ctx.translate(0, -H / 2 + 200); ctx.rotate(T * 0.5); ctx.fillStyle = 'rgba(255,255,255,.12)';
    if (!legend) for (let i = 0; i < 10; i++) { ctx.rotate(TAU / 10); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, -30); ctx.lineTo(300, 30); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, -H / 2 + 296, 90, 16, 0, 0, TAU); ctx.fill();
    if (z) drawPosed(ctx, h, z.pose, 0, -H / 2 + 296, previewScale(h, 3.1), t, T);
    else Stick.drawPreview(ctx, h, 0, 0, -H / 2 + 296, previewScale(h, 3.1), T, 'anim');
    if (legend) for (let i = 0; i < 8; i++) {
      const a = T * 1.5 + (i * TAU) / 8, x = Math.cos(a) * 150, y = -H / 2 + 190 + Math.sin(a * 1.3) * 80;
      ctx.fillStyle = '#fff7c2'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 5 + i);
      ctx.beginPath(); for (let k = 0; k < 8; k++) { const aa = (k / 8) * TAU, rr = k % 2 ? 2 : 7; ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); } ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = '#2b2118'; rrect(ctx, -W / 2 + 22, -H / 2 + 70, W - 44, 250, 16); ctx.stroke();
    // rarity + stars
    outlined(ctx, '★'.repeat(R.stars), 0, -H / 2 + 26, 30, '#ffd23f');
    ctx.fillStyle = R.color; rrect(ctx, -90, -H / 2 + 46, 180, 26, 13); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b2118'; ctx.stroke();
    outlined(ctx, (R.single || R.name).toUpperCase(), 0, -H / 2 + 60, 17, '#ffffff');
    // name & text
    if (z) {
      ctx.fillStyle = '#0b1033'; ctx.beginPath(); ctx.arc(-W / 2 + 40, -H / 2 + 38, 26, 0, TAU); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fbbf24'; ctx.stroke();
      ZArt.drawGlyph(ctx, z.id, -W / 2 + 40, -H / 2 + 38, 34, '#fde68a', 9);
      outlined(ctx, h.name.toUpperCase(), 0, H / 2 - 170, 36, '#ffffff');
      ctx.font = '900 14px Nunito, sans-serif'; ctx.fillStyle = '#fde68a';
      ctx.fillText(`${z.title.toUpperCase()} · ${h.role.toUpperCase()} · ${z.element.toUpperCase()}`, 0, H / 2 - 141);
      ctx.font = '800 14px Nunito, sans-serif'; ctx.fillStyle = '#e9e3ff';
      wrap(ctx, h.ability, 0, H / 2 - 116, W - 60, 18, 4);
    } else if (legend) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [dx, c] of [[-2.5, '#ff0055'], [2.5, '#00e5ff']]) { ctx.font = `36px ${DISPLAY}`; ctx.fillStyle = c; ctx.globalAlpha = 0.7; ctx.fillText(h.name, dx, H / 2 - 162); }
      ctx.restore();
      outlined(ctx, h.name, 0, H / 2 - 162, h.name.length > 16 ? 30 : 36, '#ffffff');
      ctx.font = '900 14px Nunito, sans-serif'; ctx.fillStyle = `hsl(${(T * 120) % 360},90%,75%)`;
      ctx.fillText(`PURITY · ${h.role.toUpperCase()}${h.limited ? ' · LIMITED' : ''}`, 0, H / 2 - 132);
      ctx.font = '800 14px Nunito, sans-serif'; ctx.fillStyle = '#f5f3ff';
      wrap(ctx, h.ability, 0, H / 2 - 108, W - 60, 18, 4);
    } else {
      outlined(ctx, h.name, 0, H / 2 - 162, h.name.length > 16 ? 30 : 36, '#ffffff');
      ctx.font = '900 14px Nunito, sans-serif'; ctx.fillStyle = R.glow;
      ctx.fillText(`${h.role.toUpperCase()}${h.limited ? ' · LIMITED' : h.exclusive ? ' · EXCLUSIVE' : ''}`, 0, H / 2 - 132);
      ctx.font = '800 15px Nunito, sans-serif'; ctx.fillStyle = '#e9e3ff';
      wrap(ctx, h.ability, 0, H / 2 - 104, W - 70, 19, 3);
    }
    // result badge
    if (res.isNew) {
      ctx.save(); ctx.translate(W / 2 - 34, -H / 2 + 34); ctx.rotate(Math.sin(T * 4) * 0.12 + 0.2);
      const s = 1 + Math.sin(T * 8) * 0.05; ctx.scale(s, s);
      ctx.beginPath(); for (let k = 0; k < 24; k++) { const aa = (k / 24) * TAU, rr = k % 2 ? 30 : 40; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath();
      ctx.fillStyle = '#ff3b6b'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2b2118'; ctx.stroke();
      outlined(ctx, 'NEW!', 0, 2, 20, '#ffffff');
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(ctx, -120, H / 2 - 44, 240, 30, 15); ctx.fill();
      outlined(ctx, `DUPLICATE  +${res.shards} SHARDS`, 0, H / 2 - 28, 16, '#7dd3fc');
    }
    ctx.restore();
  }

  /** Each Zodiac makes its own entrance on the reveal card. */
  function drawPosed(ctx, h, pose, x, y, s, t, T) {
    let dx = 0, dy = 0, a = 1, sx = 1, sy = 1, rot = 0, mode = t < 1.1 ? 'idle' : 'anim';
    const e = k => U.easeOutCubic(U.clamp(k, 0, 1));
    const fx = [];
    switch (pose) {
      case 'charge': dx = -280 * (1 - e(t / 0.5)); if (t < 0.5) mode = 'walk';
        if (t < 0.65) fx.push(() => { for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#f97316' : '#fde047'; ctx.globalAlpha = 0.7 * (1 - t / 0.65); ctx.beginPath(); ctx.arc(x + dx - 30 - i * 18, y - 30 - Math.sin(i + T * 20) * 14, 10 - i, 0, TAU); ctx.fill(); } }); break;
      case 'stomp': { const k = U.clamp(t / 0.45, 0, 1); dy = -330 * (1 - k * k);
        if (t > 0.45 && t < 0.95) fx.push(() => { const g = (t - 0.45) / 0.5; ctx.globalAlpha = 1 - g; ctx.fillStyle = '#a8a29e'; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(x + i * 22 * (1 + g * 2), y - 6 - g * 20, 9 * (1 - g * 0.5), 0, TAU); ctx.fill(); } }); break; }
      case 'split': sx = U.easeOutBack(U.clamp(t / 0.6, 0, 1)); a = U.clamp(t / 0.2, 0, 1); break;
      case 'rise': dy = 150 * (1 - e(t / 0.8)); a = U.clamp(t / 0.4, 0, 1);
        fx.push(() => { ctx.globalAlpha = 0.6; ZArt.glow(ctx, x, y - 120, 110, '#bfdbfe', 0.8); }); break;
      case 'roar': { const k = U.clamp(t / 0.6, 0, 1); sx = sy = k < 1 ? 0.5 + 0.65 * U.easeOutBack(k) : 1.15 - 0.15 * U.clamp((t - 0.6) / 0.3, 0, 1);
        fx.push(() => { ctx.save(); ctx.translate(x, y - 110); ctx.rotate(T); ctx.globalAlpha = 0.35; for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(260, -18); ctx.lineTo(260, 18); ctx.closePath(); ctx.fill(); } ctx.restore(); }); break; }
      case 'float': dy = -170 * (1 - e(t / 1.1));
        fx.push(() => { for (let i = 0; i < 10; i++) { const px = x - 160 + ((i * 47 + T * 30) % 320), py = y - 230 + ((T * 60 + i * 41) % 230); ctx.globalAlpha = 0.85; ctx.fillStyle = i % 2 ? '#bbf7d0' : '#ffffff'; ctx.beginPath(); ctx.ellipse(px, py, 4, 2, T + i, 0, TAU); ctx.fill(); } }); break;
      case 'balance': a = U.clamp(t / 0.6, 0, 1); rot = Math.sin(t * 6) * 0.3 * Math.max(0, 1 - t / 1.3); break;
      case 'emerge': a = U.clamp((t - 0.2) / 0.8, 0, 1);
        if (t < 1.4) fx.push(() => { for (let i = 0; i < 9; i++) { const g = U.clamp(t / 1.4, 0, 1); ctx.globalAlpha = 0.6 * (1 - g); ctx.fillStyle = i % 2 ? '#2e1065' : '#000000'; ctx.beginPath(); ctx.arc(x + Math.cos(i * 0.7) * (40 + g * 90), y - 60 + Math.sin(i * 1.3) * (30 + g * 40), 30 - g * 10, 0, TAU); ctx.fill(); } }); break;
      case 'shoot': a = U.clamp(t / 0.3, 0, 1); if (t > 0.3 && t < 1.1) mode = 'anim';
        if (t > 0.75 && t < 1.25) fx.push(() => { const g = (t - 0.75) / 0.5, ax = x + 40 + g * 300; ctx.globalAlpha = 1 - g; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ax - 60, y - 74); ctx.lineTo(ax, y - 74); ctx.stroke(); ZArt.star4(ctx, ax, y - 74, 9, '#ffffff'); }); break;
      case 'summit': dy = 160 * (1 - e(t / 0.8));
        fx.push(() => { ctx.globalAlpha = 1; ctx.fillStyle = '#57534e'; ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 50, y + dy + 4); ctx.lineTo(x - 36, y + 200); ctx.lineTo(x + 36, y + 200); ctx.lineTo(x + 50, y + dy + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#5eead4'; ctx.globalAlpha = 0.5 + Math.sin(T * 4) * 0.3; for (const k of [-20, 0, 20]) ctx.fillRect(x + k - 3, y + dy + 20, 6, 10); }); break;
      case 'splash': sx = sy = U.easeOutBack(U.clamp((t - 0.25) / 0.5, 0, 1));
        if (t < 1) fx.push(() => { const g = U.clamp(t / 1, 0, 1); ctx.globalAlpha = 1 - g; ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, y - 4, 30 + g * 150, 8 + g * 30, 0, 0, TAU); ctx.stroke(); for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI; ctx.fillStyle = '#a5f3fc'; ctx.beginPath(); ctx.arc(x - Math.cos(an) * 90 * g, y - Math.sin(an) * 150 * g + g * g * 80, 5, 0, TAU); ctx.fill(); } }); break;
      case 'swirl': a = U.clamp((t - 0.5) / 0.5, 0, 1);
        if (t < 1.4) fx.push(() => { for (let i = 0; i < 6; i++) { const g = U.clamp(t / 1.2, 0, 1), an = T * 5 + (i * TAU) / 6, r = 150 * (1 - g) + 30; ctx.globalAlpha = 1 - g * 0.6; ZArt.drawFish(ctx, x + Math.cos(an) * r, y - 70 + Math.sin(an) * r * 0.5, 8, Math.cos(an + Math.PI / 2) > 0 ? 1 : -1, T + i, i % 2 ? '#a5f3fc' : '#f0abfc'); } }); break;
    }
    ctx.save();
    for (const f of fx) { ctx.save(); f(); ctx.restore(); }
    ctx.globalAlpha *= a;
    ctx.translate(x + dx, y + dy); ctx.rotate(rot); ctx.scale(sx, sy);
    Stick.drawPreview(ctx, h, 0, 0, 0, s, T, mode);
    ctx.restore();
  }

  // ---------- collection ----------
  const SORTED = () => [...HEROES].sort((a, b) => RARITY[b.rarity].idx - RARITY[a.rarity].idx);
  function buildCollection() {
    const s = Save.d;
    const owned = id => !!s.heroes[id];
    const f = $('#col-filters'); f.innerHTML = '';
    const total = HEROES.length, have = HEROES.filter(h => owned(h.id)).length;
    f.appendChild(U.el('div', 'cf-count', `<b>${have}</b> / ${total} collected`));
    const inFilter = (h, key) => key === 'all' || (key === 'Z' ? !!h.zodiac : h.rarity === key);
    for (const key of ['all', ...RARITIES.map(r => r.id), 'Z']) {
      const r = RARITY[key];
      const n = HEROES.filter(h => inFilter(h, key)).length, o = HEROES.filter(h => inFilter(h, key) && owned(h.id)).length;
      const b = U.el('button', 'cf-btn' + (colFilter === key ? ' active' : '') + (key === 'Z' ? ' zf' : ''), `${r ? r.name : key === 'Z' ? 'Zodiac' : 'All'} <small>${o}/${n}</small>`);
      if (r) b.style.setProperty('--c', r.color);
      if (key === 'Z') b.style.setProperty('--c', '#6366f1');
      b.addEventListener('click', () => { colFilter = key; Sound.play('click', 0); buildCollection(); });
      f.appendChild(b);
    }
    const grid = $('#col-grid'); grid.innerHTML = '';
    const list = SORTED().filter(h => inFilter(h, colFilter));
    if (!colSel || !HERO_BY_ID[colSel]) colSel = (list.find(h => owned(h.id)) || list[0] || HEROES[0]).id;
    const sq = Meta.squad();
    for (const h of list) {
      const o = s.heroes[h.id];
      const c = U.el('button', `hcard r-${h.rarity}${o ? '' : ' unowned'}${colSel === h.id ? ' sel' : ''}`);
      c.innerHTML = `${h.zodiac ? '<div class="hc-lim zd">ZODIAC</div>' : h.limited ? '<div class="hc-lim">LIMITED</div>' : h.exclusive ? '<div class="hc-lim ex">EXCLUSIVE</div>' : ''}${sq.includes(h.id) ? '<div class="hc-sq">SQUAD</div>' : ''}${h.zodiac ? `<div class="hc-z">${ZArt.glyphSVG(h.zodiac, o ? '#fde68a' : '#6b7280', 16)}</div>` : ''}<canvas></canvas>
        <div class="hc-name">${o ? h.short : '???'}</div><div class="hc-foot"><span class="hc-stars">${starStr(rar(h).stars)}</span>${o ? `<span class="hc-lv">Lv${o.lv}</span>` : ''}</div>`;
      Stick.renderIcon(c.querySelector('canvas'), h, 0, { w: 100, h: 74, scale: 0.92 });
      c.addEventListener('click', () => { colSel = h.id; Sound.play('click', 0); buildCollection(); });
      grid.appendChild(c);
    }
    renderDetail();
    renderSquad();
  }
  function renderDetail() {
    const h = HERO_BY_ID[colSel], R = rar(h), o = Save.d.heroes[h.id];
    const lv = o ? o.lv : 1, m = Meta.heroMult(lv), mn = o && lv < HERO_MAX_LV ? Meta.heroMult(lv + 1) : null;
    const st = (label, base, fmt) => `<span>${label}<b>${fmt ? fmt(base * m) : U.fmt(base * m)}</b>${mn ? `<em>&rarr;${fmt ? fmt(base * mn) : U.fmt(base * mn)}</em>` : ''}</span>`;
    const banners = h.zodiac ? ['Zodiac Summon'] : h.limited ? [BANNER_BY_ID[h.limited].name + ' (limited)'] : ['Standard Summon', ...LIMITED_BANNERS.filter(b => b.featured.includes(h.id)).map(b => b.name + ' (rate-up)')];
    const d = $('#col-detail');
    d.className = `r-${h.rarity}`;
    d.innerHTML = `<div class="cd-art"><canvas></canvas><div class="cd-rar" style="background:${R.color}">${starStr(R.stars)} ${(R.single || R.name).toUpperCase()}</div>${h.zodiac ? `<div class="cd-lim zd">${ZArt.glyphSVG(h.zodiac, '#fde68a', 14)} ${ZODIAC_BY_ID[h.zodiac].name.toUpperCase()}</div>` : h.limited ? '<div class="cd-lim">LIMITED</div>' : ''}</div>
      <div class="cd-name">${o ? h.name + (h.title ? ` <small class="cd-title">${h.title}</small>` : '') : '??? ' + (R.single || R.name) + ' Stickfigure'}</div>
      <div class="cd-role">${h.role} &middot; ${h.attack === 'heal' ? 'Healer' : h.range > 120 ? 'Ranged' : h.attack === 'area' ? 'Area melee' : 'Melee'}</div>
      ${o ? `<div class="cd-desc">${h.desc}</div>` : ''}
      <div class="cd-ab"><b>ABILITY</b> ${o ? h.ability : 'Summon this Stickfigure to reveal its ability.'}</div>
      ${o ? `<div class="cd-stats">${st('HP', h.hp)}${h.attack === 'heal' ? st('Heal', h.heal) : st('DMG', h.dmg)}<span>Range<b>${h.range}</b></span><span>Speed<b>${h.speed}</b></span><span>Cost<b>${h.cost}</b></span><span>Cooldown<b>${h.cd}s</b></span></div>` : ''}
      ${o ? `<div class="cd-lv">LEVEL <b>${lv}</b> / ${HERO_MAX_LV} <span>&middot; owned x${o.copies || 1}</span></div>` : `<div class="cd-lock">Not summoned yet. Find it on: <b>${banners.join(', ')}</b></div>`}
      <div class="cd-btns"></div>`;
    detailCv = d.querySelector('canvas');
    if (!o) detailCv.classList.add('sil');
    const btns = d.querySelector('.cd-btns');
    if (o) {
      const cost = Meta.heroUpCost(h, lv);
      const up = U.el('button', 'btn btn-green', lv >= HERO_MAX_LV ? 'MAX LEVEL' : `Level up &middot; <i class="shard"></i>${cost}`);
      up.disabled = lv >= HERO_MAX_LV || Save.d.shards < cost;
      up.addEventListener('click', () => { if (Meta.upgradeHero(h.id)) { Sound.play('upgrade'); buildCollection(); achPopups(); } });
      btns.appendChild(up);
      const slot = Meta.slotOf(h.id);
      if (slot >= 0) {
        const rm = U.el('button', 'btn btn-red', `Remove (slot ${(slot + 1) % 10})`);
        rm.addEventListener('click', () => { Meta.unequip(slot); Sound.play('click', 0); buildCollection(); });
        btns.appendChild(rm);
      } else {
        const add = U.el('button', 'btn btn-yellow', pickMode ? 'Pick a slot below...' : 'Add to Squad');
        add.addEventListener('click', () => { pickMode = !pickMode; Sound.play('click', 0); renderDetail(); renderSquad(); });
        btns.appendChild(add);
      }
    } else {
      const go = U.el('button', 'btn btn-summon', '<i class="tok"></i>Go to Summon');
      go.addEventListener('click', () => { if (h.limited && Meta.isActive(h.limited)) selBanner = h.limited; UI.show('summon'); });
      btns.appendChild(go);
    }
  }
  function renderSquad() {
    const wrap = $('#squad-slots'); wrap.innerHTML = '';
    $('#squad-bar').classList.toggle('picking', pickMode);
    $('#sq-hint').textContent = pickMode ? `Choose a slot for ${HERO_BY_ID[colSel].name} (it replaces the stickman there).` : 'Tap a Stickfigure, then "Add to Squad" to bring it into battle. Keys 1-0 match the slots.';
    Meta.squad().forEach((id, i) => {
      const h = HERO_BY_ID[id], def = h || UNIT_BY_ID[id];
      const locked = !h && !Progress.isUnitUnlocked(def);
      const el = U.el('button', `sq-slot${h ? ' hero r-' + h.rarity : ''}${locked ? ' locked' : ''}`);
      el.innerHTML = `<span class="sq-key">${(i + 1) % 10}</span><canvas></canvas><div class="sq-name">${locked ? '???' : def.short}</div>`;
      Stick.renderIcon(el.querySelector('canvas'), def, 0, { w: 76, h: 56, scale: 0.85 });
      el.addEventListener('click', () => {
        if (pickMode) {
          if (Meta.equip(colSel, i)) { Sound.play('summon', 0); pickMode = false; buildCollection(); }
          return;
        }
        if (h) { colSel = h.id; buildCollection(); }
        else UI.toast(locked ? 'Locked: clear more levels to unlock this unit' : `${def.name}: level it up in the Barracks`);
      });
      wrap.appendChild(el);
    });
  }

  // ---------- hooks ----------
  function onShow(name) {
    refresh();
    if (name !== 'collection') pickMode = false;
    if (name === 'summon') buildSummon();
    if (name === 'collection') buildCollection();
    if (name === 'map') {
      const welcome = Meta.takeWelcome();
      const st = Meta.dailyState();
      if (welcome || (st.claimable && dailyShownFor !== Meta.dayKey())) {
        dailyShownFor = Meta.dayKey();
        setTimeout(() => { if (Game.screen === 'map') openDaily(!!welcome); }, 350);
      }
      achPopups();
    }
  }
  function tick(dt, t) {
    if (anim) tickAnim(dt, t);
    if (Game.screen === 'summon' && !anim) tickSummon(t, dt);
    if (Game.screen === 'collection' && detailCv && !anim) {
      const h = HERO_BY_ID[colSel];
      const ctx = fitCanvas(detailCv, 440, 200);
      ctx.clearRect(0, 0, 440, 200);
      const R = rar(h);
      const g = ctx.createRadialGradient(220, 170, 10, 220, 140, 240);
      g.addColorStop(0, R.glow); g.addColorStop(1, R.color + '00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 440, 200);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(220, 182, 70, 12, 0, 0, TAU); ctx.fill();
      Stick.drawPreview(ctx, h, 0, 210, 182, previewScale(h, 2.2), t, Save.d.heroes[h.id] ? 'anim' : 'idle');
    }
  }
  function init() {
    Meta.onChange(refresh);
    $('#btn-daily').addEventListener('click', () => { Sound.play('click', 0); openDaily(false); });
    $('#btn-quests').addEventListener('click', () => { Sound.play('click', 0); openQuests(); });
    $$('#ov-quests .tab').forEach(t => t.addEventListener('click', () => { qTab = t.dataset.tab; Sound.play('click', 0); renderQuests(); }));
    $('#btn-claim-daily').addEventListener('click', claimDaily);
    $('#btn-summon').addEventListener('click', () => { Sound.play('click', 0); UI.show('summon'); });
    $('#btn-collection').addEventListener('click', () => { Sound.play('click', 0); UI.show('collection'); });
    $$('.tok-pill').forEach(p => p.addEventListener('click', () => { if (Game.screen !== 'summon') { Sound.play('click', 0); UI.show('summon'); } }));
    $('#btn-rates').addEventListener('click', () => { Sound.play('click', 0); openRates(); });
    $('#btn-pull1').addEventListener('click', () => doPull(1));
    $('#btn-pull10').addEventListener('click', () => doPull(10));
    $('#pull-cv').addEventListener('pointerdown', nextReveal);
    $('#btn-pull-skip').addEventListener('click', () => { if (anim) showSummary(); });
    $('#btn-ps-done').addEventListener('click', () => { Sound.play('click', 0); closeAnim(); });
    $('#btn-ps-col').addEventListener('click', () => { Sound.play('click', 0); closeAnim(); UI.show('collection'); });
    $('#btn-ps-again').addEventListener('click', () => {
      if (!lastPull) return;
      if (!Meta.isActive(lastPull.bannerId)) { closeAnim(); UI.toast('That banner has ended!'); return; }
      doPull(lastPull.count, lastPull.bannerId);
    });
    window.addEventListener('keydown', e => {
      if (!anim) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (anim.phase === 'summary') closeAnim(); else nextReveal(); }
      if (e.key === 'Escape' && anim.phase !== 'summary') showSummary();
    });
    refresh();
  }

  /** Play the summon reveal for any Stickfigure without spending tokens (for previews/testing). */
  function previewSummon(id, isNew = true) {
    const h = HERO_BY_ID[id];
    if (!h) return;
    lastPull = lastPull || { count: 1, bannerId: 'standard' };
    startAnim([{ hero: h, rIdx: RARITY[h.rarity].idx, isNew, shards: isNew ? 0 : RARITY[h.rarity].shards }]);
  }

  return { init, tick, onShow, refresh, gain, achPopups, openDaily, openQuests, previewSummon, get animating() { return !!anim; } };
})();
