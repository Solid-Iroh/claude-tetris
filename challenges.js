'use strict';

// Modos de juego: Maratón (clásico con todo activo) y 5 desafíos con objetivo.
// Un modo: { id, name, goal, flags:{powerups,abilities,specials}, startLevel?, setup(), onTick(dt),
//            onPlace(piece), onLock(cleared), check() → 'win'|'lose'|null, hud() → string, lossReason? }
const NO_EXTRAS = { powerups: false, abilities: false, specials: false };
const GARBAGE_EVERY_MS = 10000;
const REVERSE_FROM_LEVEL = 5;
const OBJECTIVE = 13;
const GARBAGE = 15;

const menuEl = document.getElementById('menu');
const menuListEl = document.getElementById('menu-list');
const modeNameEl = document.getElementById('mode-name');
const modeHudEl = document.getElementById('mode-hud');

function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function countCells(value) {
  let n = 0;
  for (const row of board) for (const v of row) if (v === value) n++;
  return n;
}

// Celdas recién bloqueadas visibles unos instantes en el modo "invisibles".
let revealCells = [];
function cellVisible(r, c) {
  if (!mode.hideLocked) return true;
  return revealCells.some(f => f.r === r && f.c === c && f.until > gameTime);
}

function pushGarbage() {
  const overflow = board[0].some(Boolean);
  board.shift();
  const row = new Array(COLS).fill(GARBAGE);
  row[Math.floor(Math.random() * COLS)] = 0;
  board.push(row);
  // La pieza activa sube con el tablero; si aun así choca (o se perdió una fila), se acabó.
  current.y--;
  if (overflow || collide(current.shape, current.x, current.y)) endGame(false);
}

const MODES = {
  marathon: {
    id: 'marathon', name: 'Maratón', goal: 'Clásico con power-ups, piezas especiales y habilidades',
    flags: { powerups: true, abilities: true, specials: true },
    setup() {}, onTick() {}, onPlace() {}, onLock() {}, check: () => null, hud: () => '',
  },
  sprint: {
    id: 'sprint', name: 'Sprint', goal: 'Limpia 40 líneas en 2 minutos',
    flags: NO_EXTRAS, lossReason: 'TIEMPO AGOTADO',
    setup() {}, onTick() {}, onPlace() {}, onLock() {},
    check: () => lines >= 40 ? 'win' : gameTime >= 120000 ? 'lose' : null,
    hud: () => `${fmtTime(120000 - gameTime)} · ${Math.min(lines, 40)}/40`,
  },
  garbage: {
    id: 'garbage', name: 'Basura', goal: 'Sobrevive 2 minutos con basura subiendo cada 10s',
    flags: NO_EXTRAS, nextGarbage: 0,
    setup() { this.nextGarbage = GARBAGE_EVERY_MS; },
    onTick() {
      while (!gameOver && gameTime >= this.nextGarbage) {
        pushGarbage();
        this.nextGarbage += GARBAGE_EVERY_MS;
      }
    },
    onPlace() {}, onLock() {},
    check: () => gameTime >= 120000 ? 'win' : null,
    hud: () => `${fmtTime(120000 - gameTime)} · basura en ${fmtTime(MODES.garbage.nextGarbage - gameTime)}`,
  },
  fixed: {
    id: 'fixed', name: 'Bloques fijos', goal: 'Elimina todos los bloques naranjas pre-colocados',
    flags: NO_EXTRAS,
    setup() {
      // 6 filas inferiores con bloques objetivo; cada fila deja ≥3 huecos para poder limpiarla.
      for (let r = ROWS - 6; r < ROWS; r++) {
        const cols = shuffle([...Array(COLS).keys()]).slice(0, 4 + Math.floor(Math.random() * 3));
        for (const c of cols) board[r][c] = OBJECTIVE;
      }
    },
    onTick() {}, onPlace() {}, onLock() {},
    check: () => countCells(OBJECTIVE) === 0 ? 'win' : null,
    hud: () => `${countCells(OBJECTIVE)} bloques restantes`,
  },
  invisible: {
    id: 'invisible', name: 'Invisibles', goal: 'Limpia 30 líneas: las piezas se ocultan al tocar el suelo',
    flags: NO_EXTRAS, hideLocked: true,
    setup() { revealCells = []; },
    onTick() {},
    onPlace(piece) {
      const until = gameTime + 300;
      piece.shape.forEach((row, r) => row.forEach((v, c) => {
        if (v) revealCells.push({ r: piece.y + r, c: piece.x + c, until });
      }));
      revealCells = revealCells.filter(f => f.until > gameTime);
    },
    onLock() {},
    check: () => lines >= 30 ? 'win' : null,
    hud: () => `${Math.min(lines, 30)}/30 líneas`,
  },
  reverse: {
    id: 'reverse', name: 'Rotación inversa', goal: 'Llega al nivel 8: desde el nivel 5 la rotación se invierte',
    flags: NO_EXTRAS, startLevel: 3, reverseRotation: true, announced: false,
    setup() { this.announced = false; },
    onTick() {}, onPlace() {},
    onLock() {
      if (!this.announced && level >= REVERSE_FROM_LEVEL) {
        this.announced = true;
        addPopup('↺ ROTACIÓN INVERTIDA', '#e57373');
      }
    },
    check: () => level >= 8 ? 'win' : null,
    hud: () => `Nivel ${level}/8` + (level >= REVERSE_FROM_LEVEL ? ' · ↺ invertida' : ''),
  },
};
const MODE_ORDER = ['marathon', 'sprint', 'garbage', 'fixed', 'invisible', 'reverse'];

function updateModeHUD() {
  if (!modeNameEl) return;
  modeNameEl.textContent = mode.name.toUpperCase();
  const text = mode.hud();
  if (modeHudEl.textContent !== text) modeHudEl.textContent = text;
}

function renderMenu() {
  menuListEl.innerHTML = MODE_ORDER.map((id, i) =>
    `<button class="menu-btn" data-mode="${id}"><kbd>${i + 1}</kbd> <strong>${MODES[id].name}</strong>` +
    `<span>${MODES[id].goal}</span></button>`).join('');
}

function showMenu() {
  gameOver = true;
  paused = false;
  cancelAnimationFrame(animId);
  abilityMenu = null;
  abilityMenuEl.classList.add('hidden');
  overlay.classList.add('hidden');
  menuEl.classList.remove('hidden');
}

function startMode(id) {
  menuEl.classList.add('hidden');
  init(MODES[id]);
}

menuListEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-mode]');
  if (btn) { startMode(btn.dataset.mode); btn.blur(); }
});

document.addEventListener('keydown', e => {
  if (menuEl.classList.contains('hidden')) return;
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (m && MODE_ORDER[+m[1] - 1]) startMode(MODE_ORDER[+m[1] - 1]);
});

renderMenu();
