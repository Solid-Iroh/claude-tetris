# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tetris in vanilla JavaScript + HTML5 Canvas + CSS. No dependencies, no build step, no tests, no linter. The README is in Spanish; UI strings in the game ("PAUSA", "Puntuación") are too.

## Running

Open `index.html` directly, or serve statically: `python3 -m http.server 8000` then visit `http://localhost:8000`.

## Architecture

Classic scripts (no modules) sharing one global scope, loaded in this order by `index.html`: `pieces.js`, `audio.js`, `game.js`, `scoring.js`, `powerups.js`, `abilities.js`, `challenges.js`, `main.js`. Top-level `let/const/function` are visible across files; cross-file calls are resolved at runtime, so order only matters for top-level code (e.g. `abilities.js` reads DOM ids at load). `main.js` boots by showing the mode menu (`showMenu()`), not by calling `init()`.

`index.html` supplies the DOM ids the scripts look up (`board`, `next-canvas`, `hold-canvas`, `score`, `lines`, `level`, `combo`, `mode-name`, `mode-hud`, `energy-section`, `energy-bar`, `energy-fill`, `ability-menu`, `ability-box`, `menu`, `menu-list`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`, `menu-btn`, `theme-toggle`, `mute-state`) — renaming any of them requires updating the `getElementById` calls.

- **Files**: `pieces.js` = constants, `COLORS`/`COLORS_LIGHT`, `PIECES`, `makePiece(type, power)`, `newBag()`. `game.js` = core state/loop/drawing/input/hold. `scoring.js` = `scoreLock` (combo/T-spin/B2B/perfect clear), popups, flash/shake. `powerups.js` = power-up pieces and effects. `abilities.js` = energy bar, ability menu, undo snapshot. `challenges.js` = `MODES` and the start menu.
- **State** is global `let`s (`board`, `current`, `queue`, `hold`, `holdCharges`, `score`, `lines`, `level`, `combo`, `b2b`, `energy`, `mode`, ...), all reset in `init(mode)`. The restart button calls `init(mode)`; the menu calls `startMode(id)`.
- **Board** is `ROWS×COLS` (20×10) of ints: `0` empty; `1–7` standard pieces, `8` Tuerca, `9–11` pentominoes (+, U, Y), `12` single, `13` challenge objective block, `14` wildcard (rainbow, from Tinte), `15` garbage. The same number indexes `COLORS` and `PIECES`. Power-up pieces are `type 12` with `piece.power` set; they are never merged into the board.
- **Queue**: `queue` is refilled from 7-bags (`newBag()`, which sometimes adds a pentomino/Tuerca when `specialsEnabled`); `queueFront(piece)` injects special pieces. `spawn()` shifts the queue.
- **Time**: all timers use `gameTime` (ms accumulated in `loop`), never `Date.now`/`setTimeout`, so they stop on pause. `currentDropInterval()` = level interval × modifiers (frozen = `Infinity`, slowed ×3).
- **Piece lifecycle**: `lockPiece()` → `snapshotForUndo()` → `merge()` (or `applyPowerUp`) → `clearLines()` (returns cleared rows, no scoring) → `scoreLock()` → `gainEnergy`/`mode.onLock`/`trackPowerSpawn` → `spawn()` (game over if the new piece collides).
- **Collision** is a single function `collide(shape, ox, oy)` used by movement, rotation (`tryRotate`, wall kicks `[0,-1,1,-2,2]`, reversed in the "reverse" challenge from level 5), ghost (`ghostY`), spawn and hold.
- **Scoring** (`scoring.js`): `(LINE_SCORES or TSPIN_SCORES)[cleared]`, ×1.5 for back-to-back hard clears, ×`(combo+1)`, +3000 (+2000 if Tetris) perfect clear, all ×`level`; soft drop +1/cell, hard drop +2/cell; level = `startLevel + floor(lines/10)`; `dropInterval = max(100, 1000 - (level-1)*90)` ms.
- **Modes** (`challenges.js`): a mode object has `flags {powerups, abilities, specials}`, `setup/onTick/onPlace/onLock/check/hud`; `loop` calls `onTick` and `check()` each frame and ends the game via `endGame(win)`.
- **Input**: one `keydown` listener in `game.js` (arrows, `X` rotate, `Space` hard drop, `C`/`Shift` hold, `E` abilities, `M` mute, `P` pause; while the ability menu is open all keys go to `handleAbilityKey`), plus small listeners in `challenges.js` (menu number keys) and debug keys (`?debug=1`) in `powerups.js`/`abilities.js`.
