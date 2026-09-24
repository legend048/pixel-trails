# Pixel Trails II — Beyond the Island

An offline, top-down pixel adventure with three worlds, sword combat, guardian bosses, treasure, rune puzzles, and a lighthouse quest.

## Play

1. Extract **the entire ZIP**.
2. Open `pixel-trails/index.html` in a modern desktop browser.
3. Meet Pip in Sunhaven, practise at the training dummy, and explore.

No installation, account, network connection, API key, build step, or paid service is required. Keep the JavaScript files and `assets` folder beside `index.html`.

If your browser restricts local files, use the optional local server. Install Node.js 18 or newer, open a terminal in this folder, and run:

```sh
npm start
```

Then open `http://localhost:4173`. No `npm install` is needed. The server listens only on your computer.

## What changed in version 2

- **Three 3072 × 2048 worlds:** Sunhaven Island, Moonveil Forest, and Emberfall Ruins. Sunhaven keeps its original artwork at twice the previous world dimensions. The forest and ruins have new scenery, paths, clearings and bridges.
- **Four portal gates:** two outbound gates in Sunhaven and a return gate in each other world. All are available immediately; travel requires interacting with a gate.
- **Combat:** directional sword swings, a short invulnerable dash, health, healing potions, coins, three sword upgrades, five creature types, and two guardian bosses. Attacks are preceded by visible warning rings.
- **More things to do:** 10 treasure chests, 16 breakable crates, nine rune stones, a training dummy, nine characters, and seven healing checkpoints. Each world's three runes unlock its sealed cache.
- **A complete quest:** collect Sunhaven's five stars, defeat both guardians for their relics, then visit Sol beside the lighthouse.
- **Mapping fixes:** ground collision grids use the same coordinate transform as the artwork. Character-sized pathfinding, bridge/stair geometry, collision substeps, safe portal arrivals, and a clamped camera prevent leaving the map or tunnelling through blocked terrain.
- **Interface:** world tabs in the map, destination buttons, a quest journal, boss health bars, desktop and touch actions, pause/help panels, optional synthesized sound, and local autosaves.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys | Direction pad |
| Walk to a location | Click an open path or a map destination | Tap a path or destination |
| Run | Hold Shift | Toggle RUN |
| Attack | Hold Space, or right-click toward a target | Hold the sword button |
| Dash | Q | Arrow action button |
| Heal 50 HP | H | Potion button |
| Talk, open, activate, rest, travel | E or click the nearby prompt | Tap the interaction prompt |
| Map / journal | M / J | Top toolbar |
| Pause / close a panel | Escape | Pause / close button |
| Collision overlay for editing | F3 | — |

Face a creature before swinging. The on-screen sword button aims at a nearby creature if one is in range. A sword swing does 30 damage, plus 10 for each upgrade. Dash has a 1.5-second cooldown. Move out of a guardian's warning ring, then attack while it recovers.

## Progress and recovery

- Campfires restore all health and set your checkpoint. Entering a world also sets a safe arrival checkpoint.
- If defeated, you return to your checkpoint with full health. Collected stars, relics, coins, upgrades, opened chests, runes and defeated creatures remain recorded.
- Creature damage resets when leaving a world; defeated creatures stay defeated.
- Dex sells potions for 15 coins and sword upgrades for 40 coins each. Three upgrades are available.
- Progress saves locally under `pixel-trails-save-v2` about every three seconds and after important events. Existing version 1 stars and character visits migrate when the old save is available in the same browser origin.
- Local-file storage behavior varies by browser. Moving the folder, changing browsers, or switching between a file and localhost may use a separate save. If storage is unavailable, the current session still works; the pause screen explains the save status.
- Restart is under Pause and requires a second confirmation. There are no cloud saves.
- Open panels and hidden tabs pause the simulation. Muted by default. Reduced-motion preferences disable optional particles and flashing.

## Source guide

| File | Purpose |
| --- | --- |
| `index.html`, `styles.css` | Responsive interface and controls |
| `realms.js` | World definitions, dialogue, objects and enemy placements |
| `collision-data.js` | Precomputed ground grids; no runtime image parsing |
| `engine.js` | Pathfinding, collision, combat, travel, quests and save validation |
| `renderer.js` | Canvas scenery, pixel characters, props, effects and maps |
| `game.js` | Input, UI, dialogue, audio and browser save integration |
| `assets/` | Three map images and the favicon |
| `tests/engine.test.cjs` | Dependency-free gameplay regression tests |
| `tools/build-collisions.py` | Optional collision authoring utility |
| `scripts/serve.mjs` | Optional local development server |

`realms.js` authors positions in the source artwork's 1536 × 1024 coordinates, then applies a single 2× transform. The engine snaps objects onto reachable terrain and keeps solid props away from narrow crossings. Edit names, dialogue, colors and placements there. Edit the brand text in `index.html`.

To regenerate collisions after replacing map artwork, install Python with Pillow, NumPy and SciPy, then run `python tools/build-collisions.py`. Review the geometry overrides for bridges, stairs and buildings, inspect the F3 overlay, and rerun tests. Generated map imagery is scenery; collision geometry is maintained separately and should always be reviewed after art changes. None of these Python packages are required to play.

## Verification

```sh
npm test
```

The 11 included tests cover routes to all 78 placed elements, representative blocked water/lava/buildings, bridge access, movement and dash boundaries, viewport/camera transforms, attack timing and facing, enemy telegraphs and immunity, single-use rewards, both portal round trips, checkpoints, save migration, and the complete star/relic/lighthouse quest.

During development, an additional direct DOM adapter with a real Canvas implementation checks scene loading, movement and combat input, map tabs, dialogue, journal, help, portal navigation, save restoration and restart. It is an internal smoke check, not a browser layout test. The cloud browser preview could not be completed in this environment, so a full browser/device compatibility sweep has not been performed.
