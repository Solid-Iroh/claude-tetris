'use strict';

// Skins visuales. Cada skin: { name, colors[1..8], bg (null = fondo del tema CSS), grid (null = --grid-line),
// drawBlock(ctx, x, y, colorIndex, size, alpha) }.
const SKIN_STORAGE_KEY = 'tetris-skin';

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * (amt < 0 ? v : 255 - v))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function pathRound(c, x, y, w, h, r) {
  c.beginPath();
  if (c.roundRect) {
    c.roundRect(x, y, w, h, r);
  } else {
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
}

const SKINS = {
  retro: {
    name: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#90caf9', '#ffb74d', '#9e9e9e'],
    bg: null,
    grid: null,
    drawBlock(c, x, y, i, size, alpha) {
      c.globalAlpha = alpha ?? 1;
      c.fillStyle = this.colors[i];
      c.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      c.globalAlpha = 1;
    },
  },

  neon: {
    name: 'Neon',
    colors: [null, '#00f5ff', '#fff700', '#d500f9', '#39ff14', '#ff1744', '#2979ff', '#ff9100', '#e0e0e0'],
    bg: '#000000',
    grid: '#14142a',
    drawBlock(c, x, y, i, size, alpha) {
      const a = alpha ?? 1;
      const col = this.colors[i];
      const px = x * size + 3, py = y * size + 3, s = size - 6;
      c.save();
      c.globalAlpha = a;
      if (a >= 1) { // el fantasma no brilla
        c.shadowBlur = 14;
        c.shadowColor = col;
      }
      c.strokeStyle = col;
      c.lineWidth = 2;
      if (a < 1) c.globalAlpha = Math.min(1, a * 2.5); // fantasma más visible sobre negro
      c.strokeRect(px, py, s, s);
      c.shadowBlur = 0;
      c.fillStyle = col;
      c.globalAlpha = a < 1 ? a * 0.5 : 0.25;
      c.fillRect(px, py, s, s);
      c.restore();
    },
  },

  pastel: {
    name: 'Pastel',
    colors: [null, '#a8e6ef', '#fff0a8', '#d9b8f0', '#b8e8c0', '#f5b5b5', '#b5d4f5', '#fcd3a0', '#cfd2d6'],
    bg: null,
    grid: null,
    drawBlock(c, x, y, i, size, alpha) {
      const px = x * size + 2, py = y * size + 2, s = size - 4;
      c.save();
      c.globalAlpha = alpha ?? 1;
      c.fillStyle = this.colors[i];
      pathRound(c, px, py, s, s, 8);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)';
      c.lineWidth = 1.5;
      pathRound(c, px + 2, py + 2, s - 4, s - 4, 6);
      c.stroke();
      c.restore();
    },
  },

  pixel: {
    name: 'Pixel art',
    colors: [null, '#29adff', '#ffec27', '#a35fd1', '#00e436', '#ff004d', '#4a6cd4', '#ffa300', '#83769c'],
    bg: null,
    grid: null,
    drawBlock(c, x, y, i, size, alpha) {
      const col = this.colors[i];
      const light = shade(col, 0.45), dark = shade(col, -0.4), mid = shade(col, -0.15);
      const n = 6, p = size / n, ox = x * size, oy = y * size;
      c.save();
      c.globalAlpha = alpha ?? 1;
      for (let r = 0; r < n; r++) {
        for (let k = 0; k < n; k++) {
          let f = col;
          if (r === 0 || k === 0) f = light;              // bisel claro arriba/izquierda
          else if (r === n - 1 || k === n - 1) f = dark;  // bisel oscuro abajo/derecha
          else if ((r + k) % 2 === 0) f = mid;            // textura de tablero
          c.fillStyle = f;
          c.fillRect(Math.floor(ox + k * p), Math.floor(oy + r * p), Math.ceil(p), Math.ceil(p));
        }
      }
      c.restore();
    },
  },
};

function loadSkinName() {
  try {
    const v = localStorage.getItem(SKIN_STORAGE_KEY);
    if (v && Object.prototype.hasOwnProperty.call(SKINS, v)) return v;
  } catch (e) { /* sin almacenamiento */ }
  return 'retro';
}

let activeSkinName = loadSkinName();
let activeSkin = SKINS[activeSkinName];

function setSkin(name, persist) {
  if (!Object.prototype.hasOwnProperty.call(SKINS, name)) name = 'retro';
  activeSkinName = name;
  activeSkin = SKINS[name];
  if (persist) {
    try { localStorage.setItem(SKIN_STORAGE_KEY, name); } catch (e) { /* ignorar */ }
  }
}
