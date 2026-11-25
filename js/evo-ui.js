'use strict';
/* =========================================================
   Evolution UI: the Lv 10 evolution sequence, Normal / Evo
   form toggles and the small widgets the Barracks, Deck and
   Collection screens share.
   ========================================================= */

const EvoUI = (() => {
  const $ = U.$;
  const W = 1280, H = 720, DISPLAY = "'Luckiest Guy', Impact, sans-serif";
  const T_CHARGE = 0.5, T_MORPH = 1.9, T_FLASH = 3.2, T_PANEL = 4.1;
  let run = null;       // the evolution being shown
  let off = null;       // offscreen canvas for silhouettes

  const baseDef = id => HERO_BY_ID[id] || UNIT_BY_ID[id];
  const themeOf = def => (def.rarity === 'P' ? 'prism' : def.hero ? RARITY[def.rarity].color : def.color);
  const colAt = (theme, t, k = 0) => (theme === 'prism' ? `hsl(${(t * 120 + k * 50) % 360},95%,65%)` : theme);
  const scaleOf = def => 3.3 / Math.max(1, Math.pow(def.scale || 1, 0.6));

  function fit(cv) {
    const k = U.clamp(Game.k || 1, 1, 2);
    const w = Math.round(W * k), h = Math.round(H * k);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(k, 0, 0, k, 0, 0);
    return { ctx, k };
  }

  /** The unit drawn as a solid silhouette of one colour. */
  function silhouette(ctx, k, def, x, y, s, t, color, alpha) {
    if (!off) off = document.createElement('canvas');
    const S = 520;
    if (off.width !== Math.round(S * k)) { off.width = off.height = Math.round(S * k); }
    const o = off.getContext('2d');
    o.setTransform(k, 0, 0, k, 0, 0);
    o.globalCompositeOperation = 'source-over';
    o.clearRect(0, 0, S, S);
    Stick.drawPreview(o, def, 0, S / 2, S * 0.8, s, t, 'idle');
    o.globalCompositeOperation = 'source-in';
    o.fillStyle = color; o.fillRect(0, 0, S, S);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.drawImage(off, x - S / 2, y - S * 0.8, S, S);
    ctx.restore();
  }

  function rays(ctx, x, y, r, n, t, color, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.25);
    ctx.globalAlpha = a;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU;
      ctx.fillStyle = i % 2 ? color : '#ffffff';
      ctx.globalAlpha = a * (i % 2 ? 0.35 : 0.16);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a0 + TAU / n / 1.6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function draw(dt) {
    const { ctx, k } = fit($('#evo-cv'));
    const r = run, t = r.t, base = r.base, evo = r.evo, theme = r.theme;
    const c0 = colAt(theme, t), cx = r.panel ? U.lerp(640, 400, U.easeOut(U.clamp((t - r.panelT) / 0.5, 0, 1))) : 640, gy = 520;
    // background
    const bg = ctx.createRadialGradient(cx, 380, 30, cx, 380, 760);
    bg.addColorStop(0, base.zodiac ? '#312e81' : '#2a1d4a'); bg.addColorStop(1, '#05030c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * 1.4 + i * 1.7));
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc((i * 181.3) % W, (i * 97.1) % H, (i % 3) * 0.5 + 0.6, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (base.zodiac) {
      ctx.globalAlpha = U.clamp((t - 0.3) / 1.5, 0, 0.55);
      ZArt.drawConstellation(ctx, base.zodiac, cx - 260, 40, 520, 300, U.clamp((t - 0.3) / 2.4, 0, 1), '#fde68a', t);
      ctx.globalAlpha = 1;
    }
    // shake
    ctx.save();
    if (r.shake > 0) { ctx.translate(U.rand(-r.shake, r.shake), U.rand(-r.shake, r.shake)); r.shake = Math.max(0, r.shake - dt * 30); }
    // rune circle on the ground
    const grow = U.clamp((t - T_CHARGE) / 1.2, 0, 1);
    ctx.save(); ctx.translate(cx, gy + 4); ctx.scale(1, 0.26); ctx.rotate(t * 0.8);
    ctx.strokeStyle = c0; ctx.lineWidth = 6; ctx.globalAlpha = 0.85 * grow;
    ctx.beginPath(); ctx.arc(0, 0, 210 * grow, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3; ctx.setLineDash([16, 12]); ctx.beginPath(); ctx.arc(0, 0, 170 * grow, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ZArt.star4(ctx, Math.cos(a) * 190 * grow, Math.sin(a) * 190 * grow, 12, c0); }
    ctx.restore();
    const s0 = scaleOf(base), s1 = scaleOf(evo);
    if (t < T_FLASH) {
      // charge: light streams into the stickman
      const charge = U.clamp((t - T_CHARGE) / (T_FLASH - T_CHARGE), 0, 1);
      ZArt.glow(ctx, cx, gy - 100, 90 + charge * 160, c0, 0.25 + charge * 0.6);
      if (t > T_CHARGE) {
        for (let i = 0; i < 26; i++) {
          const ph = (t * (0.7 + charge) + i / 26) % 1, a = i * 2.4 + t, rr = 420 * (1 - ph);
          ctx.globalAlpha = ph;
          ZArt.star4(ctx, cx + Math.cos(a) * rr, gy - 100 + Math.sin(a) * rr * 0.7, 3 + ph * 4, colAt(theme, t, i));
        }
        ctx.globalAlpha = 1;
      }
      // pillars of light
      if (charge > 0.3) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = -2; i <= 2; i++) {
          const w = 18 + Math.sin(t * 9 + i) * 6, x = cx + i * 46 * (1.2 - charge);
          const g = ctx.createLinearGradient(0, 0, 0, gy);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, colAt(theme, t, i + 2));
          ctx.globalAlpha = (charge - 0.3) * 0.5; ctx.fillStyle = g; ctx.fillRect(x - w / 2, 0, w, gy);
        }
        ctx.restore();
      }
      if (t < T_MORPH) {
        const lift = Math.sin(Math.min(1, t / T_MORPH) * Math.PI / 2) * 14;
        Stick.drawPreview(ctx, base, 0, cx, gy - lift, s0, t, 'idle');
        if (t > T_CHARGE) silhouette(ctx, k, base, cx, gy - lift, s0, t, '#ffffff', U.clamp((t - T_CHARGE) / (T_MORPH - T_CHARGE), 0, 1) * 0.85);
      } else {
        // morph: the two forms flicker faster and faster
        const m = (t - T_MORPH) / (T_FLASH - T_MORPH), period = U.lerp(0.32, 0.035, m * m);
        const showEvo = Math.floor((t - T_MORPH) / period) % 2 === 1;
        const pulse = 1 + Math.sin(t * 40) * 0.03 * m;
        const def = showEvo ? evo : base;
        silhouette(ctx, k, def, cx, gy - 14, (showEvo ? s1 : s0) * pulse, t, '#ffffff', 1);
        if (Math.floor((t - T_MORPH) / period) !== r.lastFlick) { r.lastFlick = Math.floor((t - T_MORPH) / period); if (m < 0.85) Sound.play('click', 0.02); }
      }
    } else {
      if (!r.flashed) {
        r.flashed = true; r.flash = 1; r.shake = 14;
        Sound.play('evolve', 0);
        for (let i = 0; i < 4; i++) r.rings.push({ t: -i * 0.12 });
      }
      // reveal
      const rt = t - T_FLASH;
      rays(ctx, cx, gy - 110, 620, 18, t, c0, U.clamp(rt / 0.4, 0, 1));
      ZArt.glow(ctx, cx, gy - 110, 230, c0, 0.55);
      if (base.zodiac && rt < 1.6) ZArt.drawGlyph(ctx, base.zodiac, cx - 60, gy - 380 - rt * 30, 120, '#fde68a', 14, 1);
      const bounce = rt < 0.5 ? 1 + Math.sin(rt / 0.5 * Math.PI) * 0.12 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(cx, gy + 4, 110, 18, 0, 0, TAU); ctx.fill();
      Stick.drawPreview(ctx, evo, 0, cx, gy, s1 * bounce, t, rt > 0.6 ? 'anim' : 'idle');
      for (const p of r.sparks) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt;
        if (p.life > 0) { ctx.globalAlpha = Math.min(1, p.life * 2); ZArt.star4(ctx, p.x, p.y, p.s, colAt(theme, t, p.k)); }
      }
      ctx.globalAlpha = 1;
      // headline
      const z = U.clamp(rt / 0.35, 0, 1), sz = 96 * (1.6 - 0.6 * U.easeOut(z));
      ctx.save(); ctx.globalAlpha = z; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(sz)}px ${DISPLAY}`;
      ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = '#1b1030';
      ctx.strokeText('EVOLVED!', cx, 110); ctx.fillStyle = theme === 'prism' ? c0 : '#fde047'; ctx.fillText('EVOLVED!', cx, 110);
      ctx.font = `40px ${DISPLAY}`; ctx.lineWidth = 9;
      ctx.strokeText(evo.name, cx, 190); ctx.fillStyle = '#ffffff'; ctx.fillText(evo.name, cx, 190);
      ctx.restore();
      if (t >= T_PANEL && !r.panel) showPanel();
    }
    ctx.restore();
    for (const ring of r.rings) {
      ring.t += dt;
      if (ring.t < 0 || ring.t > 0.9) continue;
      const kk = ring.t / 0.9;
      ctx.globalAlpha = 1 - kk; ctx.strokeStyle = ring.t < 0.2 ? '#ffffff' : c0; ctx.lineWidth = 10 * (1 - kk) + 2;
      ctx.beginPath(); ctx.arc(cx, gy - 110, 40 + kk * 640, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (r.flash > 0) {
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = r.flash; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      r.flash = Math.max(0, r.flash - dt * 1.6);
    }
  }

  function showPanel() {
    const r = run;
    r.panel = true; r.panelT = r.t;
    const p = $('#evo-panel');
    p.className = 'evo-panel' + (r.base.hero ? ' r-' + r.base.rarity : '');
    $('#ev-from').textContent = r.base.name;
    $('#ev-to').textContent = r.evo.name;
    $('#ev-list').innerHTML = Evo.changes(r.id).map(c => `<li>${c}</li>`).join('');
    const mv = r.evo.evoMove;
    $('#ev-move').innerHTML = mv ? `<div class="ev-mv" style="--mc:${mv.color}"><span>NEW MOVE</span><b>${mv.name}</b>${mv.desc.slice(mv.name.length + 2)}</div>` : '<div class="ev-look">New look: cape, evolved aura and Evo crest.</div>';
    for (let i = 0; i < 50; i++) r.sparks.push({ x: 400, y: 400, vx: U.rand(-420, 420), vy: U.rand(-520, -80), life: U.rand(0.6, 1.4), s: U.rand(3, 7), k: i });
  }

  /** Evolve a unit (it must be Lv 10) and play its evolution. */
  function play(id, onDone) {
    if (!Evo.isEvolved(id) && !Evo.evolve(id)) return false;
    const base = baseDef(id);
    run = { id, base, evo: Evo.def(id), theme: themeOf(base), t: 0, flash: 0, shake: 0, rings: [], sparks: [], flashed: false, panel: false, lastFlick: -1, onDone };
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * TAU, v = U.rand(120, 520);
      run.sparks.push({ x: 640, y: 410, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: U.rand(0.5, 1.6), s: U.rand(3, 7), k: i });
    }
    $('#evo-panel').className = 'evo-panel hidden';
    UI.overlay('ov-evo', true);
    Sound.play('evoCharge', 0);
    return true;
  }
  function close() {
    if (!run) return;
    const done = run.onDone;
    run = null;
    UI.overlay('ov-evo', false);
    if (done) done();
    MetaUI.achPopups();
  }
  function skip() {
    if (!run) return;
    if (run.t < T_FLASH) run.t = T_FLASH - 0.01;
    else if (!run.panel) run.t = T_PANEL;
    else close();
  }
  function tick(dt) {
    if (!run) return;
    run.t += dt;
    draw(dt);
  }

  // ---------- shared widgets ----------
  /** Normal / Evo switch for an evolved unit. */
  function toggle(id, onChange) {
    const wrap = U.el('div', 'evo-toggle');
    for (const [on, label] of [[false, 'Normal'], [true, 'Evo']]) {
      const b = U.el('button', 'et-btn' + (Evo.active(id) === on ? ' active' : '') + (on ? ' evo' : ''), on ? `&#10022; ${label}` : label);
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (Evo.active(id) === on) return;
        Evo.setActive(id, on); Sound.play(on ? 'shield' : 'click', 0);
        if (onChange) onChange();
      });
      wrap.appendChild(b);
    }
    return wrap;
  }
  /** "EVOLVE!" button for a unit that reached Lv 10. */
  function evolveBtn(id, onDone) {
    const b = U.el('button', 'btn btn-evo', '&#10022; EVOLVE! &#10022;');
    b.addEventListener('click', e => { e.stopPropagation(); play(id, onDone); });
    return b;
  }
  /** Level up and evolve straight away when Lv 10 is reached. */
  function afterLevelUp(id, onDone) {
    if (Evo.canEvolve(id)) setTimeout(() => play(id, onDone), 250);
    else if (onDone) onDone();
  }
  const badge = def => (def.evolved ? '<span class="evo-badge">EVO</span>' : '');

  function init() {
    $('#evo-cv').addEventListener('pointerdown', skip);
    $('#btn-evo-skip').addEventListener('click', skip);
    $('#btn-ev-done').addEventListener('click', close);
  }

  return { init, tick, play, toggle, evolveBtn, afterLevelUp, badge, get running() { return !!run; } };
})();
