# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tetris in vanilla JavaScript + HTML5 Canvas + CSS. No dependencies, no build step, no tests, no linter. The README is in Spanish; UI strings in the game ("PAUSA", "Puntuación") are too.

## Running

Open `index.html` directly, or serve statically: `python3 -m http.server 8000` then visit `http://localhost:8000`.

## Architecture

Everything game-related lives in `game.js` (a single script, `'use strict'`, global state, no modules). `index.html` supplies the DOM ids it looks up (`board`, `next-canvas`, `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`) — renaming any of them requires updating the `getElementById` calls at the top of `game.js`.

- **State** is module-level `let` variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, ...), all reset in `init()`, which is also the restart handler.
- **Board** is a `ROWS×COLS` (20×10) matrix of ints: `0` is empty, `1–7` index into both `COLORS` and `PIECES` (the same numbers are used as cell values inside piece shapes).
- **Game loop**: `loop(ts)` is a `requestAnimationFrame` loop that accumulates `dropAccum` and drops the piece when it exceeds `dropInterval`, then calls `draw()`. Pause/game over cancel the frame via `animId`; unpausing restarts `loop` manually.
- **Piece lifecycle**: `lockPiece()` → `merge()` → `clearLines()` (updates score/level/`dropInterval`) → `spawn()` (promotes `next`, game over if the new piece collides immediately).
- **Collision** is a single function `collide(shape, ox, oy)` used by movement, rotation (`tryRotate` with horizontal wall kicks `[0,-1,1,-2,2]`), ghost piece (`ghostY`), and spawn.
- **Scoring**: `LINE_SCORES[cleared] * level`; soft drop +1/cell, hard drop +2/cell; level = `floor(lines/10)+1`; `dropInterval = max(100, 1000 - (level-1)*90)` ms.
- **Input**: one `keydown` listener (arrows, `X` rotate, `Space` hard drop, `P` pause).
