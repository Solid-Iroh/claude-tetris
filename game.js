'use strict';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');

const GRID_COLORS = { dark: '#22222e', light: '#e3e6f0' };
const BLOCK_SHINE = { dark: 'rgba(255,255,255,0.12)', light: 'rgba(255,255,255,0.35)' };
let theme = 'dark';

let pieceStartScore, gameTime, lastMoveWasRotate, board, current, queue, hold, holdCharges, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function refillQueue() {
  while (queue.length < 6) {
    for (const type of newBag()) queue.push(makePiece(type));
  }
}

function queueFront(piece) {
  queue.unshift(piece);
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastMoveWasRotate = true;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  const rows = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      rows.push(r);
      r++;
    }
  }
  return rows;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  if (gy !== current.y) lastMoveWasRotate = false;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastMoveWasRotate = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  snapshotForUndo();
  const tspin = detectTSpin();
  if (current.power) applyPowerUp(current);
  else merge();
  const rows = clearLines();
  if (!rows.length) sfx.lock();
  else popWildcards();
  scoreLock(rows.length, tspin, rows);
  gainEnergy(rows.length, tspin);
  trackPowerSpawn(rows.length);
  if (rows.length === 4 && specialsEnabled) {
    queueFront(makePiece(SINGLE));
    addPopup('¡RECOMPENSA!', '#fff176');
    sfx.reward();
  }
  spawn();
}

function spawn() {
  current = queue.shift();
  refillQueue();
  holdCharges = 1;
  lastMoveWasRotate = false;
  if (peekPieces > 0) peekPieces--;
  pieceStartScore = score;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
  drawHold();
}

function doHold() {
  if (holdCharges <= 0) return;
  holdCharges--;
  const stored = { type: current.type, power: current.power };
  if (hold) {
    const charges = holdCharges;
    current = makePiece(hold.type, hold.power);
    hold = stored;
    holdCharges = charges;
    if (collide(current.shape, current.x, current.y)) endGame();
  } else {
    hold = stored;
    const charges = holdCharges;
    spawn();
    holdCharges = charges;
  }
  drawNext();
  drawHold();
}

// Intervalo efectivo: base por nivel × modificadores (congelar detiene la caída).
function currentDropInterval() {
  if (isFrozen()) return Infinity;
  return isSlowed() ? dropInterval * SLOW_FACTOR : dropInterval;
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  updateEnergyBar();
  if (comboEl) comboEl.textContent = combo >= 1 ? 'x' + (combo + 1) : '-';
}

function drawBlock(context, x, y, colorIndex, size, alpha, power) {
  if (!colorIndex) return;
  let color = (theme === 'light' ? COLORS_LIGHT : COLORS)[colorIndex];
  if (power) color = POWERUPS[power].color;
  else if (colorIndex === WILDCARD) color = `hsl(${(gameTime / 8 + x * 40 + y * 25) % 360}, 80%, 60%)`;
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = BLOCK_SHINE[theme];
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  if (power) {
    context.font = `${Math.floor(size * 0.65)}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#000';
    context.fillText(POWERUPS[power].emoji, x * size + size / 2, y * size + size / 2 + 1);
    context.textAlign = 'start';
    context.textBaseline = 'alphabetic';
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = GRID_COLORS[theme];
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2, current.power);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK, 1, current.power);

  drawEffects();
}

function drawPreview(c2d, cv, shape, alpha, power, region) {
  const rg = region || { x: 0, y: 0, w: cv.width, h: cv.height };
  c2d.clearRect(rg.x, rg.y, rg.w, rg.h);
  if (!shape) return;
  const rows = shape.length, cols = shape[0].length;
  const size = Math.min(30, Math.floor(rg.w / (Math.max(rows, cols) + 1)), Math.floor(rg.h / (rows + 1)));
  const ox = rg.x + (rg.w - cols * size) / 2;
  const oy = rg.y + (rg.h - rows * size) / 2;
  c2d.save();
  c2d.translate(ox, oy);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      drawBlock(c2d, c, r, shape[r][c], size, alpha, power);
  c2d.restore();
}

function drawNext() {
  const peek = peekPieces > 0;
  const h = peek ? 300 : 120;
  if (nextCanvas.height !== h) nextCanvas.height = h;
  if (!peek) {
    drawPreview(nextCtx, nextCanvas, queue[0].shape, 1, queue[0].power);
    return;
  }
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  for (let i = 0; i < 5; i++) {
    drawPreview(nextCtx, nextCanvas, queue[i].shape, 1, queue[i].power, { x: 0, y: i * 60, w: 120, h: 60 });
  }
}

function drawHold() {
  holdCanvas.classList.toggle('locked', holdCharges <= 0);
  drawPreview(holdCtx, holdCanvas, hold ? PIECES[hold.type] : null, 1, hold && hold.power);
}

function setTheme(t, save = true) {
  theme = t === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === 'light' ? '🌙 Oscuro' : '☀️ Claro';
  themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
  if (save) {
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }
  // El bucle está detenido en pausa/game over: repintar manualmente
  if (current && queue) { draw(); drawNext(); drawHold(); }
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  gameTime += dt;
  dropAccum += dt;
  if (dropAccum >= currentDropInterval()) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      lastMoveWasRotate = false;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver) return; // endGame() ocurrió dentro de este frame: no reprogramar
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  gameTime = 0;
  lastMoveWasRotate = false;
  resetScoring();
  resetPowerups();
  resetAbilities();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  queue = [];
  hold = null;
  holdCharges = 1;
  refillQueue();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  ensureAudio();
  if (abilityMenu) { handleAbilityKey(e); return; }
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) { current.x--; lastMoveWasRotate = false; }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) { current.x++; lastMoveWasRotate = false; }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyE':
      openAbilityMenu();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      doHold();
      break;
  }
  updateHUD();
});
