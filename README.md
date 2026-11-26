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

**Campaign 1: The Stick Wars**: 12 levels across 4 regions (Meadowlands, Sunscorch Desert, Frostpeak, Ashen Wastes) with new enemies introduced as you go, plus an **Endless Arena** (unlocked after level 6) with escalating waves and a saved best score.

**Campaign 2: Beyond the Margin**: 12 more levels where every battle has a twist (see below). Unlocked by clearing Shadow Citadel; switch campaigns with the tabs on the world map.

## Campaign 2: Beyond the Margin

The second campaign is built around **gimmicks that need a plan**: enemy traits that shrug off the wrong kind of attack, and stage rules that change how a battle plays. Every level card has a **Battle Briefing** that explains the rules and traits, checks your current deck against them ("Anti-air 3 ✓", "Magic 0 ✗"), and has an **Edit Deck** shortcut. Unit cards show small tags for what each unit counters: ✈ anti-air, ✦ magic, ☀ light-bearer.

**Enemy traits**

| Trait | Enemies | What it means | Counter |
| --- | --- | --- | --- |
| Flying | Skywing, Storm Roc | Flies over your army; Skywings go straight for your tower | Ranged units (range 120+) and Lancers, which shoot flyers first |
| Shielded | Phalanx | Tower shield blocks 90% of ranged damage | Melee units |
| Burrower | Tunneler | Digs under your army, untouchable, and ambushes from behind | Keep reinforcements coming; Thunder digs them out |
| Ethereal | Phantom, Wraith Queen | Fades in and out; physical hits pass through while faded | Magic (Wizards, Comet, Tide, Libra, Lantern...) always hits |
| Plated | Ironclad, Iron Tyrant | Plating soaks the first part of every hit | Heavy hitters, crits, poison and Thunder |
| Splitter | Void Blot, The Blot | Splits into smaller copies when it dies | Area damage |

**Stage rules**

| Rule | Levels | Effect |
| --- | --- | --- |
| Gale Winds | 2-2, 2-3 | Gusts alternate direction: tailwinds speed your army, headwinds stall it and speed up the enemy (flyers are pushed around even more). The HUD counts down to the next gust. |
| Darkness | 2-4 to 2-6 | Your stickmen only fight enemies inside the light around them. Light-bearers (Wizard, Lantern, Sol, Leo, Comet...) see farther; Thunder lights the whole field for 4 seconds. Enemies in the dark show only their glowing eyes. |
| Shield Generators | 2-8, 2-9 | The fortress is invulnerable until both generators on the field are destroyed. |
| Army Limit | 2-10 | Only 8 of your stickmen at once; summoned helpers don't count. |
| Budget | 2-11 | Units costing more than 400 can't be summoned (they're marked OVER BUDGET). |

**Regions and bosses**: Stormcoast (flyers and wind, boss **Storm Roc**: a flying boss whose Gale Dive blasts your army back), Gloomwood (darkness, Tunnelers and Phantoms, boss **Wraith Queen**: fades like her Phantoms and summons more), Ironworks (Ironclads and shield generators, boss **Iron Tyrant**: heavily plated, shells your army with a telegraphed cannon), The Rift (everything at once, final boss **The Blot**: sheds Void Blots and hides in an ink cocoon at 75/50/25% health, then bursts into Blotlings).

Each region also has its own look: rain and lightning over the sea cliffs, a pitch-black haunted wood with fog and fireflies, smokestacks and embers in the foundry, and a purple void with floating shards and glitching particles. Three new achievements cover the campaign.

## Stick Tokens, Summons & Collection

* **Stick Tokens** are the premium currency (shown top-right on menu screens). Earn them from the 7-day **daily login** streak, **daily quests** (3 per day + a bonus for finishing all), lifetime **achievements**, and **winning levels** (first clears, boss stages, new stars, Endless waves). New players get a 500-token welcome gift.
* **Summon** on banners: 100 tokens for one, 900 for ten (Major Rare or better guaranteed). Rarities: **Common** (50%), **Rare** (30%), **Major Rare** (14.7%), **Ultra Rare** (5%) and the mysterious **Purities** (0.3%). An Ultra Rare or better is guaranteed every 60 summons, and a hidden guarantee eventually delivers a Purity.
* **Purities** are the rarest tier: their own void-and-prism summon sequence, a prismatic shimmer in battle, and traits that bend the rules (Sol raises your gold income, Thornback reflects damage, Eraser Knight erases weakened foes).
* A permanent **Standard** banner, the permanent **Zodiac** banner (below), and two **limited banners** that rotate every 2 days with live countdowns. Each limited banner has an exclusive Stickfigure (only obtainable while it's live) and rate-ups.
* Duplicates become **Stick Shards**, used to level up Stickfigures (+12% stats per level, max 10). Stickfigures can also be **trained with XP** in the Barracks.
* The **Collection** screen shows every Stickfigure (silhouettes until summoned) and edits your 10-slot **battle squad**, so summoned Stickfigures fight alongside your regular units.

**Gacha-exclusive units** (summon only), each with its own mechanic:

| Unit | Rarity | Role | Ability |
| --- | --- | --- | --- |
| Rally Drummer | Major Rare | Buffer | Allies within 170px deal +35% damage, attack 30% faster, march 15% faster |
| Pencil Architect | Major Rare | Builder | Builds a barricade that blocks enemies for 20s |
| Inkwell Artist | Ultra Rare | Summoner | Paints 2 doodle soldiers every 6s (max 6, they fade after 18s) |
| Chrono Keeper | Ultra Rare | Controller | Freezes all enemies in a 100px area for 2s (bosses 0.7s) |
| Eraser Knight | Purity | Executioner | +7% max-HP damage per hit, erases non-boss foes below 20% HP |

### Zodiac banner: 12 Ultra Rare Stickfigures

Every Ultra Rare from the Zodiac banner is one of twelve Zodiac Stickfigures, and the **sign of the season** (the real-world zodiac season, with a countdown to the next sign) gets a 50% rate-up. Zodiac pulls play their own sequence: a starry sky, a spinning zodiac wheel that stops on the sign, its constellation drawn in light, the glowing symbol, a gold flash, and a reveal pose unique to each sign.

| Sign | Title | Role | Ability |
| --- | --- | --- | --- |
| ♈ Aries | The Starbreaker | Frontline | Every 3rd attack charges forward for 2.6x damage to all foes ahead and knocks them back; resists knockback |
| ♉ Taurus | The Astral Fortress | Tank | Takes 50% less damage, never knocked back; every 8s gives nearby allies a star shield |
| ♊ Gemini | The Twin Paradox | Hybrid | Fights beside a blue twin that mirrors attacks (55% damage); a hit on one hastens the other |
| ♋ Cancer | The Lunar Guardian | Protector | Every 7s nearby allies get a moon barrier that blocks 40% of damage for 4.5s |
| ♌ Leo | The Solar Sovereign | Buffer | Allies nearby deal +25% damage; Leo's kills trigger a roar (+40% attack speed for 4s) |
| ♍ Virgo | The Celestial Medic | Healer | Area heals that grow up to 3x stronger on badly hurt allies |
| ♎ Libra | The Cosmic Arbiter | Debuffer | Weakens the strongest enemy in range (-40% attack and speed, bosses -25%); shifts when it dies |
| ♏ Scorpio | The Void Stinger | Venom | Stacking cosmic poison (up to 6 stacks; bosses 3 at half strength) |
| ♐ Sagittarius | The Starhunter | Sniper | Arrows pierce every enemy in a line; every 4th is a long-range star arrow (1.8x) |
| ♑ Capricorn | The Eternal Summit | Controller | Gravity field slows enemies (weak foes 70%, bosses 25%) and interrupts Boomers |
| ♒ Aquarius | The Starflow | Crowd Control | A rolling wave pushes back and slows every enemy it touches |
| ♓ Pisces | The Dreamweaver | Summoner | Summons astral fish decoys that dodge attacks and soak hits |

Special units plug into the battle engine through ability hooks in `js/abilities.js`; their art registers with the stickman renderer in `js/zodiac-art.js`. `MetaUI.previewSummon('h_leo')` in the browser console replays any unit's summon reveal.

**Deck:** the Barracks has a **Deck** tab where you swap any regular unit or summoned Stickfigure into your 10 battle slots (keys 1-0).

The summonable roster, banners, rates, quests and achievements live in `js/gacha-data.js`.

## Evolution

Every stickman, all 10 regular units and all 33 Stickfigures, **evolves at level 10**. Level a regular unit with XP in the Barracks, or a Stickfigure with shards or XP (Barracks **Stickfigures** tab or the Collection). When it hits Lv 10 the evolution plays straight away: the unit glows, light pours in, its normal and evolved silhouettes flicker faster and faster, then a flash reveals the new form with its name and a list of what changed. Units that were already Lv 10 get an **EVOLVE!** button.

* **Stat boost:** most evolutions give +25% to +35% health and damage (healers get more healing), and many also improve a trait: Ranger Lord shoots farther, Shadow Master dodges more, Demolisher's blasts get bigger, Grand Architect builds a stronger barricade, and so on.
* **New look:** every evolved form has a new name and a makeover: capes, crowns, upgraded gear, an evolved aura and a floating Evo crest. Zodiacs gain a star halo with their sign; Purities a prismatic halo.
* **New moves:** the rarest units, every Ultra Rare and Purity, also learn a move on top of their original ability:

| Move | What it does | Learned by |
| --- | --- | --- |
| Nova | Every few attacks, a burst hits everything nearby | Sol Invictus (High Noon), Supernova Ram |
| Chain | Hits arc to more enemies | The Blank Page (arcs can erase weakened foes), Final Arbiter |
| Meteor | A strike falls from the sky on the enemy front | Starfall Sage (Comet Fall), Solar Monarch |
| Barrage | Volleys of homing projectiles | Master Painter, Cosmic Deluge |
| Shockwave | A wave that rolls along the ground | Tidequeen (water), Peak Eternal (rock avalanche) |
| Clone | Summons a translucent echo of itself for 12s | Lord of Hours, Binary Star |
| Orbit | Orbiting shards damage anything close | Lantern Sovereign (lanterns), Moonlit Citadel (moons) |
| Blink | Teleports to the deepest enemy and strikes it | Ink Shogun, Abyssal Stinger |
| Rain | Rains attacks over an area | Galaxy Hunter |
| Sanctuary | A zone that heals allies and hurts enemies | Astral Saint |
| Rebirth | Rises again once per battle | Worldthorn, Dream Leviathan |
| Fortify | An emergency shield and barrier when health drops low | Celestial Bastion |

Purity traits grow too: Sol Invictus raises gold income by 60%, Worldthorn reflects 60% of damage, and The Blank Page erases foes below 30% health.

**Normal or Evo, your choice:** once evolved, a **Normal / Evo** switch on the unit's Barracks card (and in the Collection) picks which form fights. Evolved units show an EVO badge in the deck, squad and battle bar.

Evolution data lives in `js/evo.js` (forms and move settings), the moves in `js/abilities.js` (`EvoFX`), and the sequence and widgets in `js/evo-ui.js`.

## Code layout

| File | Purpose |
| --- | --- |
| `index.html` | Screens, HUD and overlays |
| `css/style.css` | UI styling (fixed 1280×720 stage scaled to fit) |
| `js/util.js` | Math, seeded RNG, DOM helpers |
| `js/data.js` | Units, enemies, levels, upgrades, wallet tables |
| `js/campaign2.js` | Campaign 2: new enemies and bosses, regions, levels, stage rules, briefing text |
| `js/zodiac-data.js` | The 12 zodiac signs (glyphs, constellations, seasons) and Zodiac Stickfigures |
| `js/gacha-data.js` | Stickfigures, rarities, banners, daily rewards, quests, achievements |
| `js/save.js` | Save data and progression helpers |
| `js/meta.js` | Stick Tokens, daily rewards, quests, achievements, banner rotation, summoning, shards, squad |
| `js/zodiac-art.js` | Zodiac designs, glyphs, constellations, zodiac wheel, astral fish |
| `js/evo.js` | Evolved forms for all 43 stickmen: names, stat boosts, looks, Evo moves, Normal/Evo choice |
| `js/abilities.js` | Ability hooks for special units (Zodiacs, Purity traits) and the 12 Evo moves |
| `js/gacha-ui.js` | Summon screen and reveal animation, collection and squad editor, quests and daily popups |
| `js/evo-ui.js` | Evolution sequence, Normal/Evo switches, EVOLVE buttons |
| `js/audio.js` | Synthesized sound effects and music |
| `js/stickman.js` | Stickman skeleton, poses, animations, weapons and accessories |
| `js/scenery.js` | Themed parallax backgrounds, weather, bases, world map |
| `js/c2-art.js` | Campaign 2 enemy gear, themes, decor and weather |
| `js/battle.js` | Battle simulation: combat, projectiles, waves, economy, effects, rendering |
| `js/gimmicks.js` | Enemy traits, stage rules, Campaign 2 bosses, darkness and wind rendering |
| `js/ui.js` | Screens, HUD, input, tutorial, results |
| `js/main.js` | Boot, resize and main loop |

To tweak balance, edit the stat tables in `js/data.js`.

## Deploying to GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the game on every push to `main` (or run it manually from the Actions tab).
One-time setup: in the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
The site will be at `https://<user>.github.io/battle-sticks/`.
