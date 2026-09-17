# Pixel Trails — Prakhar’s World

A complete, playable 2D exploration game inspired by the idea of an interactive pixel-art portfolio. Walk around Sunhaven Island, meet its residents, collect five star fragments, and restore the lighthouse.

## Play immediately

1. Extract the entire ZIP.
2. Open `index.html` in a current desktop browser.
3. Explore. No install, account, API key, build step, or internet connection is needed.

Keep the files and `assets` folder together. Opening the HTML from inside a compressed ZIP will not work. If your browser restricts local files, use the optional local server below.

## Optional local server

With Node.js 18 or newer installed, open a terminal in the extracted folder:

```sh
npm start
```

Then visit `http://localhost:4173`. No `npm install` is needed because the project has no package dependencies.

Python also works:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

On Windows, use `py -m http.server 4173 --bind 127.0.0.1` if `python` is unavailable.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys | Direction pad |
| Walk to a spot | Click a path | Tap a path |
| Run | Hold Shift | Tap RUN to toggle |
| Talk | E near a character, or click the character | Tap the character or talk prompt |
| Map | M or Map button | Map button or minimap |
| Journal | J or Journal button | Journal button |
| Pause | Escape or Space | Open a panel |
| Close a panel | Escape or close button | Close button |
| Sound | Speaker button | Speaker button |

The journal also provides keyboard-accessible buttons that walk you to each resident. Characters share clues, and the journal always includes a clue for the next missing star. There is no time limit and no combat.

## Included

- Original 1536 × 1024 island artwork.
- Animated player and seven characters.
- Keyboard, click-to-walk and mobile touch controls.
- Collision-aware A* pathfinding, including the bridge across the river.
- Five collectible stars and a complete lighthouse ending.
- Six discoverable locations, conversations, map and journal.
- Canvas particles, fountain and river sparkles, fire embers, and the restored lighthouse beam.
- Optional synthesized sound effects; sound starts muted.
- Device-local progress saving, pause and restart.
- Responsive interface, keyboard controls, native accessible dialogs, live status messages, and reduced-motion support.
- Meaningful navigation, collision and saved-progress tests.

## Edit the game

| File | Purpose |
| --- | --- |
| `index.html` | Interface, title and buttons |
| `styles.css` | Colours, typography and responsive layout |
| `world.js` | Dialogue, landmarks, star positions, walkable paths, collision regions and the optional GitHub profile link |
| `engine.js` | Collision detection, A* navigation and saved-game validation |
| `game.js` | Canvas rendering, character sprites, input, audio, quest and interface behaviour |
| `assets/island.png` | The original background map |
| `assets/favicon.svg` | Small star favicon |
| `scripts/serve.mjs` | Optional Node.js static server |
| `tests/engine.test.cjs` | Navigation and saved-game tests |

To rename the game, edit the title and heading in `index.html` and `title` in `world.js`. To change profile content, edit `locations` in `world.js`. The workshop currently links to `https://github.com/legend048`; that link only opens the profile and does not connect to GitHub’s API.

All game coordinates use the original image’s 1536 × 1024 pixel space. `paths` are walkable corridors, `plazas` are walkable polygons, and `obstacles` block movement. When replacing the map, update these regions and the landmark positions together.

The character sprites are editable pixel grids near the top of `game.js`. Their colours are in `palette`.

## Test

```sh
npm test
```

The tests check reachability of every star and character, simulate movement through the quest, verify river/building collisions, and check corrupted and completed saves. They do not constitute browser or device testing.

## Saving and privacy

Progress is stored under `pixel-trails-save-v1` in browser local storage. It stays on the current device and browser; there is no backend, login, analytics or cloud sync. Local-file storage support varies by browser. If storage is blocked, the game remains playable for the current session. Opening a different local URL may use a separate save.

The game has no remote requests during play. Only the optional workshop profile link opens an external website after a click. Browser zoom, operating-system fonts and device performance can slightly change the interface appearance.

## Art and inspiration

The explorable-world concept was inspired by [Peter Oravec’s portfolio](https://peteroravec.com/). This implementation uses original code, an original generated island illustration, and original editable character sprites. It does not bundle that site’s code, map, character, biography or portfolio content.

The island is a single illustrated background with interactive gameplay layers above it. Buildings have conversations rather than separate interior levels. This is a complete small exploration quest, not a reproduction of the reference site’s entire game engine or world.

## Deployment later

These are ordinary static website files. If you choose to publish later, upload `index.html`, `styles.css`, `world.js`, `engine.js`, `game.js` and `assets/` to a static host. There is no server-side game code or build command. Nothing has been pushed to GitHub or deployed as part of this ZIP delivery.
