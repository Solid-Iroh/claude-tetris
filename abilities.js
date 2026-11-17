'use strict';

// Habilidades cargables: la barra de energía se llena al limpiar líneas.
const ENERGY_MAX = 100;
const ENERGY_PER_LINE = 10;
const ENERGY_BONUS_HARD = 15; // Tetris o T-spin con líneas
const PEEK_PIECES = 10;
const SLOW_MS = 10000;
const SLOW_FACTOR = 3;

let abilitiesEnabled = true;
let energy, peekPieces, slowUntil, undoSnapshot, abilityMenu; // abilityMenu: null | 'main' | 'swap'

const abilityMenuEl = document.getElementById('ability-menu');
const abilityBoxEl = document.getElementById('ability-box');
const energyFillEl = document.getElementById('energy-fill');
const energyBarEl = document.getElementById('energy-bar');

function resetAbilities() {
  energy = 0;
  peekPieces = 0;
  slowUntil = 0;
  undoSnapshot = null;
  abilityMenu = null;
  abilityMenuEl.classList.add('hidden');
}

function gainEnergy(cleared, tspin) {
  if (!abilitiesEnabled || !cleared) return;
  energy = Math.min(ENERGY_MAX, energy + cleared * ENERGY_PER_LINE + (cleared === 4 || tspin ? ENERGY_BONUS_HARD : 0));
}

function updateEnergyBar() {
  if (!energyFillEl) return;
  energyFillEl.style.width = energy + '%';
  energyBarEl.classList.toggle('full', energy >= ENERGY_MAX);
}

function isSlowed() {
  return gameTime < slowUntil;
}

// ---- Deshacer: instantánea previa al bloqueo de cada pieza ----
function snapshotForUndo() {
  undoSnapshot = {
    board: board.map(r => [...r]),
    score: pieceStartScore, lines, level, combo, b2b, dropInterval, linesSincePower, holdCharges,
    queue: queue.map(p => ({ type: p.type, power: p.power })),
    hold: hold ? { ...hold } : null,
    piece: { type: current.type, power: current.power },
  };
}

function restoreSnapshot() {
  const s = undoSnapshot;
  board = s.board;
  score = s.score; lines = s.lines; level = s.level;
  combo = s.combo; b2b = s.b2b; dropInterval = s.dropInterval;
  linesSincePower = s.linesSincePower;
  queue = s.queue.map(p => makePiece(p.type, p.power));
  hold = s.hold;
  holdCharges = s.holdCharges;
  current = makePiece(s.piece.type, s.piece.power);
  lastMoveWasRotate = false;
  popups = [];
  flashRows = [];
  undoSnapshot = null;
}

// ---- Menú ----
const SWAP_LABELS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

function renderAbilityMenu() {
  if (abilityMenu === 'swap') {
    abilityBoxEl.innerHTML = '<p class="menu-title">ELEGIR PIEZA</p>' +
      SWAP_LABELS.map((l, i) => `<p class="menu-item"><kbd>${i + 1}</kbd> ${l}</p>`).join('') +
      '<p class="menu-hint"><kbd>Esc</kbd> volver</p>';
    return;
  }
  const items = [
    ['Ver siguientes 5 piezas', true],
    ['Intercambiar pieza actual', true],
    ['Ralentizar tiempo 10s', true],
    ['Deshacer última colocación', !!undoSnapshot],
    ['Hold extra', true],
  ];
  abilityBoxEl.innerHTML = '<p class="menu-title">HABILIDAD</p>' +
    items.map(([t, ok], i) => `<p class="menu-item${ok ? '' : ' disabled'}"><kbd>${i + 1}</kbd> ${t}</p>`).join('') +
    '<p class="menu-hint"><kbd>Esc</kbd> cancelar</p>';
}

function openAbilityMenu() {
  if (!abilitiesEnabled || energy < ENERGY_MAX || abilityMenu || paused || gameOver) return;
  abilityMenu = 'main';
  paused = true;
  cancelAnimationFrame(animId);
  renderAbilityMenu();
  abilityMenuEl.classList.remove('hidden');
}

function closeAbilityMenu() {
  abilityMenu = null;
  abilityMenuEl.classList.add('hidden');
  paused = false;
  lastTime = performance.now();
  draw();
  loop(lastTime);
}

function useAbility(n) {
  switch (n) {
    case 1:
      peekPieces = PEEK_PIECES;
      break;
    case 2:
      abilityMenu = 'swap';
      renderAbilityMenu();
      return; // no se gasta energía hasta elegir pieza
    case 3:
      slowUntil = gameTime + SLOW_MS;
      break;
    case 4:
      if (!undoSnapshot) return;
      restoreSnapshot();
      break;
    case 5:
      holdCharges++;
      break;
  }
  energy = 0;
  closeAbilityMenu();
  refreshAfterAbility();
}

function swapCurrent(type) {
  current = makePiece(type);
  energy = 0;
  closeAbilityMenu();
  if (collide(current.shape, current.x, current.y)) endGame();
  refreshAfterAbility();
}

function refreshAfterAbility() {
  drawNext();
  drawHold();
  updateHUD();
  if (!gameOver) draw();
}

function handleAbilityKey(e) {
  e.preventDefault();
  if (e.code === 'Escape') {
    if (abilityMenu === 'swap') { abilityMenu = 'main'; renderAbilityMenu(); }
    else closeAbilityMenu();
    return;
  }
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (!m) return;
  const n = +m[1];
  if (abilityMenu === 'main' && n <= 5) useAbility(n);
  else if (abilityMenu === 'swap' && n <= 7) swapCurrent(STANDARD_TYPES[n - 1]);
}

function drawAbilityStatus() {
  if (!isSlowed()) return;
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#ffb74d';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  const t = '🐢 LENTO ' + ((slowUntil - gameTime) / 1000).toFixed(1) + 's';
  ctx.strokeText(t, COLS * BLOCK / 2, 40);
  ctx.fillText(t, COLS * BLOCK / 2, 40);
  ctx.textAlign = 'start';
}

// Modo depuración (?debug=1): F6 llena la barra de energía.
if (new URLSearchParams(location.search).get('debug') === '1') {
  document.addEventListener('keydown', e => {
    if (e.key === 'F6') { e.preventDefault(); energy = ENERGY_MAX; updateHUD(); }
  });
}
