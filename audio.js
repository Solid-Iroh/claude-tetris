'use strict';

// Efectos de sonido sintetizados con Web Audio (sin archivos externos).
let audioCtx = null;
let muted = false;
try { muted = localStorage.getItem('muted') === '1'; } catch (e) {}

function ensureAudio() {
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) audioCtx = new AC();
}

function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('muted', muted ? '1' : '0'); } catch (e) {}
  const el = document.getElementById('mute-state');
  if (el) el.textContent = muted ? 'off' : 'on';
}

function tone(freq, start, dur, type = 'square', vol = 0.06) {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime + start;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

const sfx = {
  lock() { tone(140, 0, 0.06, 'triangle', 0.08); },
  clear(n) { for (let i = 0; i < n; i++) tone(440 + i * 110, i * 0.07, 0.12); },
  combo(k) { tone(330 * Math.pow(1.122, Math.min(k, 12)), 0.15, 0.15, 'sawtooth', 0.05); },
  tspin() { tone(300, 0, 0.1, 'sawtooth'); tone(600, 0.1, 0.18, 'sawtooth'); },
  b2b() { tone(520, 0, 0.1, 'triangle', 0.08); tone(780, 0.1, 0.15, 'triangle', 0.08); },
  perfect() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.2, 'square', 0.07)); },
  power() { tone(200, 0, 0.3, 'sawtooth', 0.08); tone(900, 0.05, 0.2, 'square', 0.05); },
  reward() { tone(880, 0, 0.1, 'triangle'); tone(1175, 0.1, 0.15, 'triangle'); },
};
