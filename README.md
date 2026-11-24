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

## Stick Tokens, Summons & Collection

* **Stick Tokens** are the premium currency (shown top-right on menu screens). Earn them from the 7-day **daily login** streak, **daily quests** (3 per day + a bonus for finishing all), lifetime **achievements**, and **winning levels** (first clears, boss stages, new stars, Endless waves). New players get a 500-token welcome gift.
* **Summon** on banners: 100 tokens for one, 900 for ten (Super Rare or better guaranteed). Rarities: Common, Rare, Super Rare, Epic, Legendary, with a Legendary guaranteed every 80 summons.
* A permanent **Standard** banner plus two **limited banners** that rotate every 2 days with live countdowns. Each limited banner has an exclusive Stickfigure (only obtainable while it's live) and rate-ups.
* Duplicates become **Stick Shards**, used to level up Stickfigures (+12% stats per level, max 10).
* The **Collection** screen shows every Stickfigure (silhouettes until summoned) and edits your 10-slot **battle squad**, so summoned Stickfigures fight alongside your regular units.

**Gacha-exclusive units** (summon only), each with its own mechanic:

| Unit | Rarity | Role | Ability |
| --- | --- | --- | --- |
| Rally Drummer | Super Rare | Buffer | Allies within 170px deal +35% damage, attack 30% faster, march 15% faster |
| Pencil Architect | Super Rare | Builder | Builds a barricade that blocks enemies for 20s |
| Inkwell Artist | Epic | Summoner | Paints 2 doodle soldiers every 6s (max 6, they fade after 18s) |
| Chrono Keeper | Epic | Controller | Freezes all enemies in a 100px area for 2s (bosses 0.7s) |
| Eraser Knight | Legendary | Executioner | +7% max-HP damage per hit, erases non-boss foes below 20% HP |

**Deck:** the Barracks has a **Deck** tab where you swap any regular unit or summoned Stickfigure into your 10 battle slots (keys 1-0).

The summonable roster, banners, rates, quests and achievements live in `js/gacha-data.js`.

## Code layout

| File | Purpose |
| --- | --- |
| `index.html` | Screens, HUD and overlays |
| `css/style.css` | UI styling (fixed 1280×720 stage scaled to fit) |
| `js/util.js` | Math, seeded RNG, DOM helpers |
| `js/data.js` | Units, enemies, levels, upgrades, wallet tables |
| `js/gacha-data.js` | Stickfigures, rarities, banners, daily rewards, quests, achievements |
| `js/save.js` | Save data and progression helpers |
| `js/meta.js` | Stick Tokens, daily rewards, quests, achievements, banner rotation, summoning, shards, squad |
| `js/gacha-ui.js` | Summon screen and reveal animation, collection and squad editor, quests and daily popups |
| `js/audio.js` | Synthesized sound effects and music |
| `js/stickman.js` | Stickman skeleton, poses, animations, weapons and accessories |
| `js/scenery.js` | Themed parallax backgrounds, weather, bases, world map |
| `js/battle.js` | Battle simulation: combat, projectiles, waves, economy, effects, rendering |
| `js/ui.js` | Screens, HUD, input, tutorial, results |
| `js/main.js` | Boot, resize and main loop |

To tweak balance, edit the stat tables in `js/data.js`.

## Deploying to GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the game on every push to `main` (or run it manually from the Actions tab).
One-time setup: in the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
The site will be at `https://<user>.github.io/battle-sticks/`.
