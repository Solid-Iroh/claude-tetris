'use strict';

// Menú de pausa: Reanudar, Reiniciar, Ver controles, Nivel inicial.
// Se carga antes de game.js; usa togglePause()/init()/paused de game.js en tiempo de evento.

const START_LEVEL_KEY = 'tetris-start-level';
const MAX_START_LEVEL = 15;
const RESUME_GUARD_MS = 150;

const pauseMenu = document.getElementById('pause-menu');
const pmItems = Array.from(pauseMenu.querySelectorAll('.pm-item'));
const pmControls = document.getElementById('pm-controls');
const pmLevelValue = document.getElementById('pm-level-value');
let pmIndex = 0;
let inputBlockedUntil = 0;

function getStartLevel() {
  let v = 1;
  try { v = parseInt(localStorage.getItem(START_LEVEL_KEY), 10); } catch (e) { /* sin storage */ }
  return Number.isFinite(v) ? Math.min(MAX_START_LEVEL, Math.max(1, v)) : 1;
}

function setStartLevel(v) {
  v = Math.min(MAX_START_LEVEL, Math.max(1, v));
  try { localStorage.setItem(START_LEVEL_KEY, String(v)); } catch (e) { /* sin storage */ }
  pmLevelValue.textContent = v;
}

function pmFocus(i) {
  pmIndex = (i + pmItems.length) % pmItems.length;
  pmItems[pmIndex].focus();
}

function showPauseMenu() {
  pmControls.classList.add('hidden');
  pmLevelValue.textContent = getStartLevel();
  pauseMenu.classList.remove('hidden');
  pmFocus(0);
}

function hidePauseMenu() {
  pauseMenu.classList.add('hidden');
  if (document.activeElement && pauseMenu.contains(document.activeElement)) document.activeElement.blur();
  inputBlockedUntil = performance.now() + RESUME_GUARD_MS;
}

function pmActivate(item) {
  switch (item.dataset.action) {
    case 'resume':
      togglePause();
      break;
    case 'restart':
      hidePauseMenu();
      init();
      break;
    case 'controls':
      pmControls.classList.toggle('hidden');
      break;
  }
}

pmItems.forEach((item, i) => {
  item.addEventListener('click', e => {
    const stepBtn = e.target.closest('[data-step]');
    if (stepBtn) {
      setStartLevel(getStartLevel() + Number(stepBtn.dataset.step));
      pmFocus(i);
    } else if (item.dataset.action !== 'level') {
      pmIndex = i;
      pmActivate(item);
    }
  });
});

// Fase de captura: corre antes que el handler de game.js y bloquea sus entradas.
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if ((e.code === 'KeyP' || e.code === 'Escape') && !gameOver) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) togglePause();
    return;
  }
  if (paused) {
    e.stopImmediatePropagation();
    if (!pauseMenu.classList.contains('hidden')) {
      const item = pmItems[pmIndex];
      switch (e.code) {
        case 'Tab': e.preventDefault(); pmFocus(pmIndex + (e.shiftKey ? -1 : 1)); break;
        case 'ArrowUp': e.preventDefault(); pmFocus(pmIndex - 1); break;
        case 'ArrowDown': e.preventDefault(); pmFocus(pmIndex + 1); break;
        case 'ArrowLeft':
        case 'ArrowRight':
          if (item.dataset.action === 'level') {
            e.preventDefault();
            setStartLevel(getStartLevel() + (e.code === 'ArrowLeft' ? -1 : 1));
          }
          break;
        case 'Enter':
        case 'Space':
          e.preventDefault();
          if (!e.repeat && item.dataset.action !== 'level') pmActivate(item);
          break;
      }
    }
    return;
  }
  if (performance.now() < inputBlockedUntil) {
    e.stopImmediatePropagation();
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  }
}, true);

// Evita que Space dispare un click nativo extra sobre el botón enfocado (se activa en keyup).
document.addEventListener('keyup', e => {
  if (e.code === 'Space' && !pauseMenu.classList.contains('hidden')) e.preventDefault();
}, true);
