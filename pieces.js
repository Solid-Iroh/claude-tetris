'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#b0bec5', // Tuerca - gris metálico
  '#f06292', // Plus
  '#4db6ac', // U
  '#aed581', // Y
  '#fff176', // Single
  '#ff7043', // Objetivo (desafío)
  '#ffffff', // Comodín (arcoíris, ver drawBlock)
  '#78788c', // Basura
];

// Paleta con más contraste para fondo claro
const COLORS_LIGHT = [
  null,
  '#00acc1', '#f9a825', '#8e24aa', '#43a047', '#e53935', '#1e88e5', '#fb8c00', '#78909c',
  '#d81b60', '#00897b', '#7cb342', '#f9a825', '#e64a19', '#999999', '#5c5c70',
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // Tuerca (hueco en el centro)
  [[0,9,0],[9,9,9],[0,9,0]],                  // Plus (pentominó)
  [[10,0,10],[10,10,10],[0,0,0]],             // U (pentominó)
  [[0,11,0,0],[11,11,11,11],[0,0,0,0]],       // Y (pentominó)
  [[12]],                                      // Single (recompensa tras Tetris)
];

const STANDARD_TYPES = [1, 2, 3, 4, 5, 6, 7];
const PENTOMINOES = [9, 10, 11];
const NUT = 8;
const SINGLE = 12;

// Los desafíos pueden desactivar las piezas especiales
let specialsEnabled = true;

const LINE_SCORES = [0, 100, 300, 500, 800];

function makePiece(type, power) {
  const shape = PIECES[type].map(row => [...row]);
  return {
    type,
    power: power || null,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Genera una bolsa de tipos (7-bag). Ocasionalmente añade un pentominó (25%) y/o la Tuerca (10%).
function newBag() {
  const bag = shuffle([...STANDARD_TYPES]);
  if (specialsEnabled) {
    const extras = [];
    if (Math.random() < 0.25) extras.push(PENTOMINOES[Math.floor(Math.random() * PENTOMINOES.length)]);
    if (Math.random() < 0.10) extras.push(NUT);
    for (const t of extras) bag.splice(Math.floor(Math.random() * (bag.length + 1)), 0, t);
  }
  return bag;
}
