'use strict';

// Combos, multiplicadores, T-spin, B2B, Perfect Clear y efectos visuales.
const TSPIN_SCORES = [400, 800, 1200, 1600];
const PERFECT_CLEAR_BONUS = 3000;
const PERFECT_CLEAR_TETRIS_EXTRA = 2000;

let combo, b2b, popups, flashRows, shakeUntil, comboEl;

function resetScoring() {
  combo = -1;
  b2b = false;
  popups = [];
  flashRows = [];
  shakeUntil = 0;
  if (!comboEl) comboEl = document.getElementById('combo');
}

function addPopup(text, color) {
  popups.push({ text, color: color || '#ffd54f', t0: gameTime, y: popups.length });
}

// T-spin: pieza T, última acción fue rotar y ≥3 de las 4 esquinas del 3×3 ocupadas.
function detectTSpin() {
  if (current.type !== 3 || !lastMoveWasRotate) return false;
  let filled = 0;
  for (const [dr, dc] of [[0, 0], [0, 2], [2, 0], [2, 2]]) {
    const x = current.x + dc, y = current.y + dr;
    if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x])) filled++;
  }
  return filled >= 3;
}

function isBoardEmpty() {
  return board.every(row => row.every(v => v === 0));
}

// Se llama tras cada bloqueo con el número de líneas limpiadas y si fue T-spin.
function scoreLock(cleared, tspin, rows) {
  if (!cleared) {
    if (tspin) {
      score += 400 * level;
      addPopup('T-SPIN', '#ba68c8');
      sfx.tspin();
    }
    combo = -1;
    updateHUD();
    return;
  }

  combo++;
  const hard = cleared === 4 || tspin;
  let base = tspin ? TSPIN_SCORES[cleared] : LINE_SCORES[cleared];
  if (hard && b2b) {
    base = Math.floor(base * 1.5);
    addPopup('B2B ' + (tspin ? 'T-SPIN' : 'TETRIS'), '#4dd0e1');
    sfx.b2b();
  }
  b2b = hard ? true : false;

  let total = base * (combo + 1);
  if (isBoardEmpty()) {
    total += PERFECT_CLEAR_BONUS + (cleared === 4 ? PERFECT_CLEAR_TETRIS_EXTRA : 0);
    addPopup('PERFECT CLEAR!', '#ffd54f');
    sfx.perfect();
    shakeUntil = gameTime + 400;
  }
  score += total * level;

  if (tspin) {
    addPopup('T-SPIN ' + ['', 'SINGLE', 'DOUBLE', 'TRIPLE'][cleared], '#ba68c8');
    sfx.tspin();
  } else if (cleared === 4) {
    addPopup('TETRIS!', '#4dd0e1');
    shakeUntil = gameTime + 300;
  }
  if (combo >= 1) {
    addPopup('COMBO x' + (combo + 1), '#ff8a65');
    sfx.combo(combo);
  }
  sfx.clear(cleared);

  flashRows = rows.map(r => ({ r, until: gameTime + 250 }));
  lines += cleared;
  level = Math.floor(lines / 10) + 1;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  updateHUD();
}

function drawEffects() {
  // destello de filas limpiadas
  flashRows = flashRows.filter(f => f.until > gameTime);
  for (const f of flashRows) {
    ctx.globalAlpha = Math.min(1, (f.until - gameTime) / 250) * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, f.r * BLOCK, COLS * BLOCK, BLOCK);
  }
  ctx.globalAlpha = 1;

  // textos flotantes
  popups = popups.filter(p => gameTime - p.t0 < 1200);
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px system-ui, sans-serif';
  for (const p of popups) {
    const age = (gameTime - p.t0) / 1200;
    ctx.globalAlpha = 1 - age * age;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    const y = 120 + p.y * 26 - age * 30;
    ctx.strokeText(p.text, COLS * BLOCK / 2, y);
    ctx.fillText(p.text, COLS * BLOCK / 2, y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';

  canvas.classList.toggle('shake', gameTime < shakeUntil);
}
