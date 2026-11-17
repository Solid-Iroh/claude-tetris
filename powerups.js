'use strict';

// Power-ups: piezas 1×1 especiales que aparecen cada POWER_EVERY líneas.
const POWER_EVERY = 5;
const FREEZE_MS = 5000;
const WILDCARD = 14;

const POWERUPS = {
  bomba:    { name: 'BOMBA',    emoji: '💣', color: '#e57373' },
  rayo:     { name: 'RAYO',     emoji: '⚡', color: '#ffd54f' },
  tinte:    { name: 'TINTE',    emoji: '🎨', color: '#ba68c8' },
  gravedad: { name: 'GRAVEDAD', emoji: '🧲', color: '#90caf9' },
  congelar: { name: 'CONGELAR', emoji: '❄️', color: '#4dd0e1' },
};
const POWER_KEYS = Object.keys(POWERUPS);

let powerupsEnabled = true;
let linesSincePower, freezeUntil;

function resetPowerups() {
  linesSincePower = 0;
  freezeUntil = 0;
}

function randomPowerPiece() {
  return makePiece(SINGLE, POWER_KEYS[Math.floor(Math.random() * POWER_KEYS.length)]);
}

// Cuenta líneas limpiadas y encola un power-up cada POWER_EVERY.
function trackPowerSpawn(cleared) {
  if (!powerupsEnabled || !cleared) return;
  linesSincePower += cleared;
  if (linesSincePower >= POWER_EVERY) {
    linesSincePower -= POWER_EVERY;
    const piece = randomPowerPiece();
    queueFront(piece);
    addPopup('POWER-UP: ' + POWERUPS[piece.power].name, POWERUPS[piece.power].color);
  }
}

// Cada columna cae al fondo eliminando huecos.
function compactColumns() {
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = 0; r < ROWS; r++) if (board[r][c]) col.push(board[r][c]);
    for (let r = ROWS - 1; r >= 0; r--) board[r][c] = col.length ? col.pop() : 0;
  }
}

function destroyCell(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS || !board[r][c]) return 0;
  board[r][c] = 0;
  return 1;
}

function mostFrequentColor() {
  const counts = {};
  for (const row of board) for (const v of row) if (v && v !== WILDCARD) counts[v] = (counts[v] || 0) + 1;
  let best = 0, bestN = 0;
  for (const k in counts) if (counts[k] > bestN) { best = +k; bestN = counts[k]; }
  return best;
}

// Aplica el efecto en la posición de aterrizaje (x, y) de la pieza (no se fusiona al tablero).
function applyPowerUp(piece) {
  const x = piece.x, y = piece.y;
  let destroyed = 0;
  switch (piece.power) {
    case 'bomba':
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) destroyed += destroyCell(y + dr, x + dc);
      shakeUntil = gameTime + 300;
      break;
    case 'rayo':
      for (let c = 0; c < COLS; c++) destroyed += destroyCell(y, c);
      for (let r = 0; r < ROWS; r++) destroyed += destroyCell(r, x);
      shakeUntil = gameTime + 200;
      break;
    case 'tinte': {
      const below = y + 1 < ROWS ? board[y + 1][x] : 0;
      const target = below && below !== WILDCARD ? below : mostFrequentColor();
      if (target) {
        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++) if (board[r][c] === target) board[r][c] = WILDCARD;
      }
      break;
    }
    case 'gravedad':
      compactColumns();
      break;
    case 'congelar':
      freezeUntil = gameTime + FREEZE_MS;
      break;
  }
  if (destroyed) score += 10 * level * destroyed;
  sfx.power();
}

// Si se limpió alguna línea, los comodines del tablero desaparecen como bonus.
function popWildcards() {
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (board[r][c] === WILDCARD) { board[r][c] = 0; n++; }
  if (n) {
    score += 50 * level * n;
    addPopup('COMODINES +' + 50 * level * n, '#ffffff');
    compactColumns();
  }
}

function isFrozen() {
  return gameTime < freezeUntil;
}

function drawPowerStatus() {
  if (!isFrozen()) return;
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = POWERUPS.congelar.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  const t = ((freezeUntil - gameTime) / 1000).toFixed(1);
  ctx.strokeText('❄️ CONGELADO ' + t + 's', COLS * BLOCK / 2, 20);
  ctx.fillText('❄️ CONGELADO ' + t + 's', COLS * BLOCK / 2, 20);
  ctx.textAlign = 'start';
}

// Modo depuración (?debug=1): F1–F5 encolan cada power-up, F7 suma 9 líneas.
if (new URLSearchParams(location.search).get('debug') === '1') {
  document.addEventListener('keydown', e => {
    const m = /^F([1-5])$/.exec(e.key);
    if (m) {
      e.preventDefault();
      queueFront(makePiece(SINGLE, POWER_KEYS[+m[1] - 1]));
      drawNext();
    } else if (e.key === 'F7') {
      e.preventDefault();
      lines += 9;
      level = startLevel + Math.floor(lines / 10);
      updateHUD();
    }
  });
}
