# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the games

No build step — open the HTML files directly in a browser:

```
open tictactoe.html
open shooter/index.html
```

There is no package.json, no server requirement, and no transpilation. Everything runs as plain ES2017+ in a modern browser.

## Repository layout

- `tictactoe.html` — self-contained Tic Tac Toe (single file, no dependencies)
- `shooter/` — Neon Siege top-down shooter
  - `index.html` — canvas element + CSS scale + loads scripts in order: `sprites.js` then `game.js`
  - `sprites.js` — pixel-art drawing only; exposes one global: `window.Sprites`
  - `game.js` — all game logic (state machine, entities, physics, rendering, game loop)

## Neon Siege architecture

### Canvas
Physical size is 640×480. CSS scales it 1.5× to 960×720 with `image-rendering: pixelated`. All game coordinates are in the 640×480 space. Mouse positions from browser events must be scaled back: `(e.clientX - rect.left) * (640 / rect.width)`.

### Script load order matters
`sprites.js` must load before `game.js` because `game.js` calls `Sprites.init()` and `Sprites.drawPlayer/drawEnemy` at runtime. `Sprites` is a plain IIFE on `window`.

### Game loop
`requestAnimationFrame` with delta-time. `MAX_DT = 0.05` caps the timestep to prevent entity teleportation after tab switches. The loop runs unconditionally — all state branches are inside `update(dt)`.

### State machine
Six states: `MENU → PLAYING ↔ PAUSED`, `PLAYING → LEVEL_CLEAR → PLAYING` (next level) or `VICTORY`, `PLAYING → GAME_OVER`. Transitions go through `transition(next)` which guards against re-entering the same state and fires one-time side effects (e.g. `emitVictoryBurst`). The `LEVEL_CLEAR` and `PLAYING` transition requires setting `currentState` directly after calling `transition()` because `transition()` guards same-state re-entry.

### Entity lifecycle
All entities have an `alive` boolean. They are never spliced mid-frame; instead `alive = false` is set and the arrays are filtered with `.filter(e => e.alive)` at the end of each `PLAYING` update tick. The `LevelManager.enemiesAlive` counter is decremented inside `Enemy.takeDamage()` exactly once (guarded by `if (!this.alive) return`).

### Level / wave system
`LEVELS` array holds level configs. Each level has a `waves` array where `delay` is **absolute seconds from level start** (not relative to previous wave). `LevelManager.waveTimer` counts up; a `while` loop spawns all waves whose delay has passed. Level completes when `allWavesSpawned && enemiesAlive === 0`.

Add a new level by appending to `LEVELS` in `game.js`. Add a new enemy type by adding an entry to `ENEMY_DEFS` and a corresponding case in `Enemy.update()`, plus sprite frames + cache in `sprites.js`.

### Input
`Input.keys` — held keys (use for movement). `Input.keysJustPressed` — single-frame edge-detected keys (use for menu/pause transitions). Both are reset correctly via `Input.poll()` called once per frame before `update()`.

### Pixel art / sprites
Sprites are 2D arrays of hex color strings (`null` = transparent), drawn with `fillRect` at a fixed `pixelSize` multiplier. Pre-rendered to off-screen canvases at `Sprites.init()`. All draw coordinates are passed through `Math.round()` to keep pixels crisp. The player body is drawn un-rotated; only the gun arm is drawn in a `ctx.rotate(player.angle)` context.

## Git workflow

**Commit and push frequently throughout every work session** — after each feature, fix, or meaningful change, not just at the end. This ensures work is never lost and any change can be reverted cleanly.

```bash
git add <specific files>          # stage only the relevant files
git commit -m "imperative title

- bullet detail if multi-file

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

Rules:
- Push immediately after every commit — do not let commits accumulate locally
- Write commit messages in the imperative ("Add X", "Fix Y", not "Added X")
- Stage files individually, never `git add .` or `git add -A`
- One logical change per commit — don't bundle unrelated edits

Remote: `https://github.com/LeventRommel/ClaudeCodeTest01` (branch `main`).
