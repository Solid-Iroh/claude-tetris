'use strict';

// Tabla de records local (localStorage). Expone el global `Records`.
const Records = (() => {
  const KEY = 'tetris-records';
  const NAME_KEY = 'tetris-player-name';
  const MAX = 5;

  function load() {
    const empty = { top: [], bestCombo: 0, maxLines: 0 };
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (!d || !Array.isArray(d.top)) return empty;
      return {
        top: d.top.filter(r => r && Number.isFinite(r.score)).slice(0, MAX),
        bestCombo: Number(d.bestCombo) || 0,
        maxLines: Number(d.maxLines) || 0,
      };
    } catch (e) { return empty; }
  }

  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
  }

  // Posicion (0-based) que ocuparia la puntuacion, o -1 si no entra en el top.
  function rankFor(score, d = load()) {
    if (score <= 0) return -1;
    const idx = d.top.findIndex(r => score > r.score);
    if (idx !== -1) return idx;
    return d.top.length < MAX ? d.top.length : -1;
  }

  function lastName() {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
  }

  // Renderiza la tabla en `el`; resalta la fila `highlight` (0-based).
  function render(el, highlight = -1) {
    const d = load();
    el.textContent = '';
    const table = document.createElement('table');
    table.className = 'records-table';
    const head = table.createTHead().insertRow();
    ['#', 'NOMBRE', 'PUNTOS', 'LÍN.'].forEach(t => {
      const th = document.createElement('th');
      th.textContent = t;
      head.appendChild(th);
    });
    const body = table.createTBody();
    for (let i = 0; i < MAX; i++) {
      const r = d.top[i];
      const tr = body.insertRow();
      if (i === highlight) tr.className = 'highlight';
      const cells = r
        ? [i + 1, r.name, r.score.toLocaleString(), r.lines]
        : [i + 1, '---', '-', '-'];
      cells.forEach(v => { tr.insertCell().textContent = v; });
    }
    el.appendChild(table);
    const stats = document.createElement('p');
    stats.className = 'records-stats';
    stats.textContent = `MEJOR COMBO: ${d.bestCombo} · MÁX. LÍNEAS: ${d.maxLines}`;
    el.appendChild(stats);
  }

  // Actualiza mejor combo / maximo de lineas (cada partida) y devuelve el rank.
  function updateStats(g) {
    const d = load();
    d.bestCombo = Math.max(d.bestCombo, g.maxCombo);
    d.maxLines = Math.max(d.maxLines, g.lines);
    save(d);
  }

  function add(g, name) {
    const d = load();
    const rank = rankFor(g.score, d);
    if (rank === -1) return -1;
    d.top.splice(rank, 0, {
      name: (name || '').trim().slice(0, 12) || 'ANON',
      score: g.score, lines: g.lines, level: g.level,
      maxCombo: g.maxCombo, date: new Date().toISOString(),
    });
    d.top.length = Math.min(d.top.length, MAX);
    const n = (name || '').trim().slice(0, 12);
    if (n) try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* ignore */ }
    save(d);
    return rank;
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  // --- UI ---
  const $ = id => document.getElementById(id);

  function isUIOpen() {
    return !$('start-screen').classList.contains('hidden') ||
      document.activeElement === $('name-input');
  }

  // Limpia el estado de game over (llamado desde init()).
  function resetUI() {
    $('record-badge').classList.add('hidden');
    $('record-entry').classList.add('hidden');
    $('overlay-records').textContent = '';
    $('save-record-btn').onclick = null;
    $('name-input').onkeydown = null;
    $('name-input').blur();
  }

  function showStart() {
    render($('start-records'));
    $('start-screen').classList.remove('hidden');
  }

  function hideStart() {
    $('start-screen').classList.add('hidden');
    if (document.activeElement) document.activeElement.blur();
  }

  // Llamado desde endGame(): g = {score, lines, level, maxCombo}.
  function onGameOver(g) {
    updateStats(g);
    const rank = rankFor(g.score);
    const entry = $('record-entry');
    const badge = $('record-badge');
    const list = $('overlay-records');
    badge.classList.toggle('hidden', rank !== 0);
    if (rank === -1) {
      entry.classList.add('hidden');
      render(list);
      return;
    }
    list.textContent = '';
    entry.classList.remove('hidden');
    const input = $('name-input');
    input.value = lastName();
    input.focus();
    input.select();
    const submit = () => {
      const idx = add(g, input.value);
      entry.classList.add('hidden');
      input.blur();
      render(list, idx);
    };
    $('save-record-btn').onclick = submit;
    input.onkeydown = e => { if (e.key === 'Enter') submit(); };
  }

  function bind(startGame) {
    $('play-btn').addEventListener('click', () => { hideStart(); startGame(); });
    $('reset-records-btn').addEventListener('click', () => {
      if (confirm('¿Borrar todos los records?')) { reset(); render($('start-records')); }
    });
  }

  return { resetUI, onGameOver, showStart, bind, isUIOpen, load, rankFor };
})();
