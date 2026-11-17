# Solmar Bay — make.fun gta6-01 entry (burst 2)

<!-- SPDX-License-Identifier: MIT -->

An original open-world 3D game built for the make.fun **gta6-01** competition —
a sun-soaked fictional coastal city, explored on foot and by car, with traffic,
pedestrians, a wanted level, police chases and roadblocks, five courier jobs,
street combat, generative sound and a save that survives the browser.

**Solmar Bay** is a city that exists only in this game. You are **Dax Marlowe**,
freelance courier: take jobs from the board, cross town against the clock, steal
a car when your feet are not enough, punch your way out of a crowd when you
have to, and stay ahead of the Bay PD as the wanted stars climb. Nothing here
is borrowed — no real places, no names, art or music from any commercial game.

## What's in the game

- A procedural 3D city: downtown towers, a marina boulevard, a beach with a
  pier, a park with a pond, a lighthouse, billboards and palm trees
- Walk (WASD + mouse orbit camera) and drive (enter / steal parked cars with E)
- AI traffic on the grid, including one yellow taxi, and pedestrians who stroll,
  jog, sell from carts, take photos and walk their dogs
- Wanted level 0–5 stars, with Bay PD cruisers that chase and ram — and
  roadblocks across the road from 3 stars up
- Five jobs in a chain, each with a beacon, a timer where the story needs one
  and a cash payout: a pickup, a timed delivery, a police escape, a two-stop
  taxi fare, and the big score at the bank with a five-star getaway
- Street combat: F throws a punch; a walker goes down and flees, and a cruiser
  that sees it raises the heat. Cruiser rams cost health; health creeps back
- HUD with a live minimap (roads, beach, park, traffic, police, roadblocks,
  pedestrians, a dotted route line to the job), wanted stars, cash, health,
  speed and a job board showing all five jobs and their rewards
- Generative WebAudio: an engine hum that follows your speed, a two-tone siren
  while the heat is on, and cash, punch and pickup sounds — M mutes
- Save / load in the browser: progress writes when a job pays out and every
  15 seconds; the menu offers Continue with your cash and job
- Start screen and pause; screenshots staged from the live game

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

WASD move & drive · mouse drag orbits the camera · SHIFT run · SPACE brake ·
E enter / steal a car · F punch · ENTER take the next job · M mute · P pause

## Files

- `game/index.html` — the page and the whole HUD
- `game/src/config.js` — tuning, palette, the five jobs
- `game/src/roads.js` — the grid: lines, lanes, sidewalks
- `game/src/city.js` — the procedural city builder
- `game/src/vehicles.js` — car meshes and the driving model
- `game/src/traffic.js` — AI traffic and the cars you can steal
- `game/src/pedestrians.js` — walkers, joggers, vendors, tourists, dog walkers
- `game/src/player.js` — Dax on foot and in a car, with health
- `game/src/combat.js` — the punch
- `game/src/police.js` — wanted level, cruisers, roadblocks
- `game/src/missions.js` — the five-job chain
- `game/src/hud.js` — the DOM overlay and the job board
- `game/src/minimap.js` — the live top-down map
- `game/src/camera.js` — the third-person chase camera
- `game/src/input.js` — keyboard, mouse and touch
- `game/src/audio.js` — generative WebAudio sound
- `game/src/save.js` — localStorage save / load
- `game/src/shots.js` — screenshot staging
- `game/src/main.js` — bootstrap and the main loop
- `tools/shots.mjs` — takes the four screenshots with headless Chromium

## Screenshots

```sh
node tools/shots.mjs
# writes screenshots/1-cover.jpg … 4-menu.jpg
```
