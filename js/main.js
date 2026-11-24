'use strict';
/* =========================================================
   Boot, resize handling and the main render loop.
   ========================================================= */

const Game = {
  screen: 'title',
  battle: null,   // active Battle
  level: null,    // level of the active battle
  demo: null,     // attract-mode battle shown behind menus
  scale: 1,       // CSS px per logical px
  k: 1,           // canvas px per logical px
  res: 1,         // resolution for pre-rendered scenery
  t: 0,
};

(() => {
  const gameEl = U.$('#game'), uiEl = U.$('#ui'), canvas = U.$('#view');
  const ctx = canvas.getContext('2d');

  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const scale = Math.min(vw / VIEW_W, vh / VIEW_H);
    const w = Math.max(1, Math.floor(VIEW_W * scale)), h = Math.max(1, Math.floor(VIEW_H * scale));
    gameEl.style.width = w + 'px'; gameEl.style.height = h + 'px';
    gameEl.style.left = Math.floor((vw - w) / 2) + 'px'; gameEl.style.top = Math.floor((vh - h) / 2) + 'px';
    Game.scale = w / VIEW_W;
    uiEl.style.transform = `scale(${Game.scale})`;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    Game.k = canvas.width / VIEW_W;
    Game.res = U.clamp(Math.round(Game.k * 4) / 4, 0.5, 2);
  }

  function makeDemo() {
    const theme = U.pick(['meadow', 'desert', 'snow', 'volcano']);
    return new Battle({ n: 0, name: 'Demo', theme, width: VIEW_W, baseHp: 1, mult: 1.4 }, { demo: true, roster: [] });
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    Game.t += dt;
    ctx.setTransform(Game.k, 0, 0, Game.k, 0, 0);
    try {
      if (Game.screen === 'battle' && Game.battle) {
        Game.battle.frame(dt);
        Game.battle.render(ctx, Game.res);
      } else if (Game.screen === 'map') {
        Scenery.MapScene.render(ctx, Game.t, dt, Game.res, Progress.frontier());
      } else {
        if (!Game.demo) Game.demo = makeDemo();
        Game.demo.frame(dt);
        Game.demo.render(ctx, Game.res);
      }
      UI.tick(dt, Game.t);
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(frame);
  }

  Save.load();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  UI.init();
  requestAnimationFrame(t => { last = t; frame(t); });
})();
