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
    for (const { banner, ends } of act.list) {
      const t = U.el('button', 'bn-tab' + (banner.id === selBanner ? ' active' : ''));
      t.style.setProperty('--c1', banner.colors[0]); t.style.setProperty('--c2', banner.colors[1]);
      t.innerHTML = `<canvas width="70" height="70"></canvas><div><div class="bt-tag">${banner.tag}</div><div class="bt-name">${banner.name}</div>
        <div class="bt-time" data-ends="${ends || ''}">${ends ? fmtTime(ends - Meta.now()) : 'Always available'}</div></div>`;
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
  function updateBannerInfo() {
    const { banner, ends } = curBanner();
    $('#bn-tag').textContent = banner.tag;
    $('#bn-tag').classList.toggle('limited', !banner.permanent);
    $('#bn-name').textContent = banner.name;
    $('#bn-desc').textContent = banner.desc;
    $('#bn-timer').innerHTML = ends ? `<span>ENDS IN</span> ${fmtTime(ends - Meta.now())}` : '<span>PERMANENT</span> banner';
    const f = $('#bn-featured'); f.innerHTML = '';
    for (const id of banner.featured) {
      const h = HERO_BY_ID[id], r = rar(h);
      f.appendChild(U.el('div', 'bf-chip', `<span class="bf-r" style="background:${r.color}">${r.id}</span>${h.name}${h.limited ? '<em>LIMITED</em>' : ''}`));
    }
    const tok = Save.d.tokens || 0;
    $('#btn-pull1 .pc b').textContent = GACHA.single; $('#btn-pull10 .pc b').textContent = GACHA.multi;
    $('#btn-pull1').classList.toggle('poor', tok < GACHA.single);
    $('#btn-pull10').classList.toggle('poor', tok < GACHA.multi);
    $('#sb-pity').innerHTML = `Legendary guaranteed within <b>${Meta.pityLeft()}</b> summons`;
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
      const { ends } = curBanner();
      if (ends) $('#bn-timer').innerHTML = `<span>ENDS IN</span> ${fmtTime(ends - Meta.now())}`;
    }
  }
  function drawBannerArt(ctx, banner, t, W, H) {
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
    let html = `<div class="rt-note">1 summon = <i class="tok"></i>${GACHA.single} &middot; 10 summons = <i class="tok"></i>${GACHA.multi} (Super Rare or better guaranteed) &middot; Legendary guaranteed every ${GACHA.pity} summons.</div>`;
    if (!banner.permanent) html += `<div class="rt-note">Featured Stickfigures make up ${Math.round(GACHA.featuredChance * 100)}% of pulls of their rarity. Limited ones can only be summoned while this banner is live.</div>`;
    for (const r of [...RARITIES].reverse()) {
      const list = pool.filter(h => h.rarity === r.id);
      html += `<div class="rt-row"><div class="rt-r" style="background:${r.color}">${r.name}<b>${r.rate}%</b></div><div class="rt-list">${list.map(h => `<span class="${banner.featured.includes(h.id) && !banner.permanent ? 'feat' : ''}">${h.name}${h.limited ? ' &#9733;' : ''}</span>`).join('')}</div></div>`;
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
  function startAnim(results) {
    anim = { results, i: 0, t: 0, phase: 'charge', parts: [], rings: [], flash: 0, shake: 0, hint: 0, dur: results.length > 1 ? 1.25 : 1.7 };
    $('#pull-summary').classList.add('hidden');
    $('#pull-hint').classList.add('hidden');
    $('#btn-pull-skip').classList.toggle('hidden', results.length < 2);
    UI.overlay('ov-pull', true);
    Sound.play('gcharge', 0);
  }
  function nextReveal() {
    if (!anim) return;
    if (anim.phase === 'charge') { anim.t = anim.dur; return; }
    if (anim.phase === 'reveal' && anim.t < 0.35) return;
    if (anim.phase !== 'reveal') return;
    anim.i++;
    if (anim.i >= anim.results.length) { showSummary(); return; }
    Object.assign(anim, { t: 0, phase: 'charge', hint: 0, rings: [] });
    $('#pull-hint').classList.add('hidden');
    Sound.play('gcharge', 0);
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
      c.innerHTML = `${r.isNew ? '<div class="ps-new">NEW!</div>' : ''}<canvas></canvas><div class="ps-stars" style="color:${R.color}">${starStr(R.stars)}</div><div class="ps-name">${h.name}</div>
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
    if (A.phase === 'charge') {
      const th = [0.3, 0.5, 0.66, 0.8].map(f => f * A.dur);
      let hint = 0; for (let i = 0; i < 4; i++) if (A.t >= th[i] && i < rIdx) hint = i + 1;
      if (hint > A.hint) { A.hint = hint; A.flash = 0.35; A.shake = 4 + hint * 3; Sound.play('ghint', 0); A.rings.push({ t: 0, c: RARITIES[hint].color }); }
      for (let k = 0; k < 4; k++) {
        const a = Math.random() * TAU, d = 380 + Math.random() * 120;
        partSpawn({ x: 640 + Math.cos(a) * d, y: 330 + Math.sin(a) * d, a, d, sp: 260 + Math.random() * 200, life: 2, t: 0, kind: 'in', c: Math.random() < 0.5 ? '#ffffff' : RARITIES[A.hint].color });
      }
      if (A.t >= A.dur) {
        A.phase = 'reveal'; A.t = 0; A.flash = 1; A.shake = 6 + rIdx * 4;
        A.rings.push({ t: 0, c: RARITIES[rIdx].color }, { t: -0.12, c: '#ffffff' });
        const n = 50 + rIdx * 25;
        for (let k = 0; k < n; k++) {
          const a = Math.random() * TAU, v = 200 + Math.random() * (500 + rIdx * 150);
          partSpawn({ x: 640, y: 330, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, life: 1.2 + Math.random() * 0.8, t: 0, kind: 'conf', rot: Math.random() * 6, c: Math.random() < 0.6 ? RARITIES[rIdx].color : '#ffffff' });
        }
        Sound.play('greveal' + rIdx, 0);
        if (cur.isNew && rIdx >= 2) setTimeout(() => Sound.play('unlock', 0), 350);
        setTimeout(() => { if (anim && anim.phase === 'reveal') $('#pull-hint').classList.remove('hidden'); }, 500);
        $('#pull-hint').textContent = anim.results.length > 1 ? `Tap to continue (${anim.i + 1}/${anim.results.length})` : 'Tap to continue';
      }
    }
    const shown = A.phase === 'charge' ? A.hint : rIdx;
    const col = RARITIES[shown].color;
    // background
    const sx = A.shake ? (Math.random() * 2 - 1) * A.shake : 0, sy = A.shake ? (Math.random() * 2 - 1) * A.shake : 0;
    A.shake *= Math.exp(-dt * 6);
    const bg = ctx.createRadialGradient(640, 330, 20, 640, 330, 800);
    bg.addColorStop(0, A.phase === 'summary' ? '#1a1235' : col + '55'); bg.addColorStop(0.45, '#130b2a'); bg.addColorStop(1, '#05030c');
    ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1280, 720);
    ctx.save(); ctx.translate(sx, sy);
    // rays
    if ((A.phase === 'reveal' && rIdx >= 1) || (A.phase === 'charge' && A.hint >= 1) || A.phase === 'summary') {
      ctx.save(); ctx.translate(640, 330); ctx.rotate(T * 0.25);
      const nR = 18;
      for (let i = 0; i < nR; i++) {
        ctx.rotate(TAU / nR);
        ctx.fillStyle = rIdx === 4 && A.phase === 'reveal' ? `hsla(${(i * 40 + T * 120) % 360},90%,65%,.16)` : (A.phase === 'summary' ? '#ffffff' : col) + '22';
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
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.vx *= 0.985; p.rot += dt * 8;
        ctx.globalAlpha = Math.max(0, 1 - p.t / p.life); ctx.fillStyle = p.c;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-4, -2, 8, 4); ctx.restore();
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
    if (A.flash > 0) {
      ctx.globalAlpha = Math.min(1, A.flash); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1280, 720); ctx.globalAlpha = 1;
      A.flash = Math.max(0, A.flash - dt * 2.4);
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
    const h = res.hero, R = rar(h), legend = R.idx === 4;
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
    ctx.save();
    rrect(ctx, -W / 2 + 22, -H / 2 + 70, W - 44, 250, 16); ctx.clip();
    const ag = ctx.createRadialGradient(0, -H / 2 + 230, 10, 0, -H / 2 + 200, 260);
    ag.addColorStop(0, R.glow); ag.addColorStop(0.5, R.color + '88'); ag.addColorStop(1, '#1b1433');
    ctx.fillStyle = ag; ctx.fillRect(-W / 2, -H / 2 + 60, W, 270);
    ctx.save(); ctx.translate(0, -H / 2 + 200); ctx.rotate(T * 0.5); ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 10; i++) { ctx.rotate(TAU / 10); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, -30); ctx.lineTo(300, 30); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, -H / 2 + 296, 90, 16, 0, 0, TAU); ctx.fill();
    Stick.drawPreview(ctx, h, 0, 0, -H / 2 + 296, previewScale(h, 3.1), T, 'anim');
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
    outlined(ctx, R.name.toUpperCase(), 0, -H / 2 + 60, 17, '#ffffff');
    // name & text
    outlined(ctx, h.name, 0, H / 2 - 162, h.name.length > 16 ? 30 : 36, '#ffffff');
    ctx.font = '900 14px Nunito, sans-serif'; ctx.fillStyle = R.glow;
    ctx.fillText(`${h.role.toUpperCase()}${h.limited ? ' · LIMITED' : h.exclusive ? ' · EXCLUSIVE' : ''}`, 0, H / 2 - 132);
    ctx.font = '800 15px Nunito, sans-serif'; ctx.fillStyle = '#e9e3ff';
    wrap(ctx, h.ability, 0, H / 2 - 104, W - 70, 19, 3);
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

  // ---------- collection ----------
  const SORTED = () => [...HEROES].sort((a, b) => RARITY[b.rarity].idx - RARITY[a.rarity].idx);
  function buildCollection() {
    const s = Save.d;
    const owned = id => !!s.heroes[id];
    const f = $('#col-filters'); f.innerHTML = '';
    const total = HEROES.length, have = HEROES.filter(h => owned(h.id)).length;
    f.appendChild(U.el('div', 'cf-count', `<b>${have}</b> / ${total} collected`));
    for (const key of ['all', ...RARITIES.map(r => r.id)]) {
      const r = RARITY[key];
      const n = HEROES.filter(h => (key === 'all' || h.rarity === key)).length, o = HEROES.filter(h => (key === 'all' || h.rarity === key) && owned(h.id)).length;
      const b = U.el('button', 'cf-btn' + (colFilter === key ? ' active' : ''), `${r ? r.name : 'All'} <small>${o}/${n}</small>`);
      if (r) b.style.setProperty('--c', r.color);
      b.addEventListener('click', () => { colFilter = key; Sound.play('click', 0); buildCollection(); });
      f.appendChild(b);
    }
    const grid = $('#col-grid'); grid.innerHTML = '';
    const list = SORTED().filter(h => colFilter === 'all' || h.rarity === colFilter);
    if (!colSel || !HERO_BY_ID[colSel]) colSel = (list.find(h => owned(h.id)) || list[0] || HEROES[0]).id;
    const sq = Meta.squad();
    for (const h of list) {
      const o = s.heroes[h.id];
      const c = U.el('button', `hcard r-${h.rarity}${o ? '' : ' unowned'}${colSel === h.id ? ' sel' : ''}`);
      c.innerHTML = `${h.limited ? '<div class="hc-lim">LIMITED</div>' : h.exclusive ? '<div class="hc-lim ex">EXCLUSIVE</div>' : ''}${sq.includes(h.id) ? '<div class="hc-sq">SQUAD</div>' : ''}<canvas></canvas>
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
    const banners = h.limited ? [BANNER_BY_ID[h.limited].name + ' (limited)'] : ['Standard Summon', ...LIMITED_BANNERS.filter(b => b.featured.includes(h.id)).map(b => b.name + ' (rate-up)')];
    const d = $('#col-detail');
    d.className = `r-${h.rarity}`;
    d.innerHTML = `<div class="cd-art"><canvas></canvas><div class="cd-rar" style="background:${R.color}">${starStr(R.stars)} ${R.name.toUpperCase()}</div>${h.limited ? '<div class="cd-lim">LIMITED</div>' : ''}</div>
      <div class="cd-name">${o ? h.name : '??? ' + R.name + ' Stickfigure'}</div>
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

  return { init, tick, onShow, refresh, gain, achPopups, openDaily, openQuests, get animating() { return !!anim; } };
})();
