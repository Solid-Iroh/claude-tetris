'use strict';

restartBtn.addEventListener('click', () => init(mode));
document.getElementById('menu-btn').addEventListener('click', showMenu);
themeToggle.addEventListener('click', () => {
  setTheme(theme === 'light' ? 'dark' : 'light');
  themeToggle.blur(); // evita que Space active el botón
});

let savedTheme = 'dark';
try { savedTheme = localStorage.getItem('theme') || 'dark'; } catch (e) {}
setTheme(savedTheme, false);

mode = MODES.marathon;
showMenu();

document.getElementById('mute-state').textContent = muted ? 'off' : 'on';
