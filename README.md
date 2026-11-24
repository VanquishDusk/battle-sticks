# Battle Sticks

A side-scrolling base-defense strategy game for the browser. Summon an army of stickmen, hold the line, and smash the enemy fortress before it flattens your tower.

Plain HTML5 Canvas + vanilla JavaScript: no build step, no dependencies, no asset files (all art is drawn procedurally and every sound is synthesized with WebAudio).

## Play

Open `index.html` in any modern browser. It works straight from the file system, or you can serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

Progress is saved automatically in `localStorage`.

## How to play

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Summon a unit | Tap its card | `1`–`9`, `0` |
| Upgrade wallet | Wallet button | `Q` |
| Thunder strike | Thunder button | `Space` |
| Look around | Drag the battlefield, tap the minimap, mouse wheel | `A` / `D` or arrow keys |
| Toggle 1x / 2x speed | Speed button | `F` |
| Pause | Pause button | `P` / `Esc` |

* Gold refills over time and when enemies die. A higher **wallet** level earns faster and holds more gold.
* Units march on their own, stop when something is in range, and fight automatically.
* **Thunder** charges over time and strikes every enemy near your side of the field, knocking them back and stunning them.
* Units are knocked back when they lose a chunk of health, and big hitters can send foes flying.
* Bring the enemy fortress below half health and it panics, sending an **Enemy Rush** (and its boss, on boss stages).
* Win to earn **XP** and stars (based on how healthy your tower is), unlock new stickmen, and spend XP in the **Barracks** (unit levels) and **Upgrades** (permanent bonuses).

## Content

**10 player stickmen**: Stickling, Shieldbearer (armored tank), Brawler (knockback punches), Archer, Ninja (dodge and crits), Bomber (splash), Medic (area heals), Wizard (splash and slow), Lancer (pierces every enemy in reach), Giant (huge area smashes).

**10 enemy types**: Grunt, Runner, Slinger (ranged), Brute (tank), Boomer (suicide bomber), Hexer (heals allies), Dark Knight (armored), plus three bosses: Warlord, Titan and the summoning Shadow King.

**12 levels** across 4 regions (Meadowlands, Sunscorch Desert, Frostpeak, Ashen Wastes) with new enemies introduced as you go, plus an **Endless Arena** (unlocked after level 6) with escalating waves and a saved best score.

## Code layout

| File | Purpose |
| --- | --- |
| `index.html` | Screens, HUD and overlays |
| `css/style.css` | UI styling (fixed 1280×720 stage scaled to fit) |
| `js/util.js` | Math, seeded RNG, DOM helpers |
| `js/data.js` | Units, enemies, levels, upgrades, wallet tables |
| `js/save.js` | Save data and progression helpers |
| `js/audio.js` | Synthesized sound effects and music |
| `js/stickman.js` | Stickman skeleton, poses, animations, weapons and accessories |
| `js/scenery.js` | Themed parallax backgrounds, weather, bases, world map |
| `js/battle.js` | Battle simulation: combat, projectiles, waves, economy, effects, rendering |
| `js/ui.js` | Screens, HUD, input, tutorial, results |
| `js/main.js` | Boot, resize and main loop |

To tweak balance, edit the stat tables in `js/data.js`.
