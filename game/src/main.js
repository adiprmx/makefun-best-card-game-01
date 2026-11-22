// EMBERGRID bootstrap: read the URL, build the table, wire input. Live play
// seeds from the clock; ?seed=N fixes the shuffle, and ?shot=start|play|win|
// lose jumps straight to a deterministic scene for screenshots.
import { newGame, placeCard, emptyCells, endTurn } from './engine.js';
import { chooseMove } from './ai.js';
import { applyShot } from './shots.js';
import { buildStatic, render, floatDamage } from './render.js';
import { mulberry32 } from './rng.js';

const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const shot = params.get('shot');
const seed = seedParam === null ? (Date.now() % 2147483647) : (Number(seedParam) >>> 0 || 1);
const rng = mulberry32(seed);

buildStatic();
if (shot !== null) document.body.classList.add('noanim');

let state = newGame(seed, rng);
let ui = { screen: 'title', intent: 'The Warden waits.', selected: null, cursor: 4, busy: false };

function sync() {
  render(state, ui);
  // In a screenshot scene the floating numbers must not freeze mid-air:
  // the frame shows only what the rules left on the table.
  if (!document.body.classList.contains('noanim')) floatDamage(state);
  render(state, ui);
  const status = document.getElementById('status');
  if (status) {
    status.textContent = state.phase === 'over'
      ? (state.winner === 'you' ? 'Victory. The Warden\u2019s lantern is out.' : 'Defeat. Your lantern dies.')
      : `Turn ${state.turn}. Your life ${state.you.life}, Warden life ${state.foe.life}.`;
  }
}

function startGame() {
  state = newGame(seed, rng);
  ui = { screen: 'play', intent: 'Your move, Keeper. Place a sigil.', selected: null, cursor: 4, busy: false };
  sync();
}

function tryPlace(cell) {
  if (ui.screen !== 'play' || ui.busy || state.phase !== 'play') return;
  if (ui.selected === null) return;
  if (state.grid[cell] !== null) return;
  ui.busy = true;
  const ok = placeCard(state, 'you', ui.selected, cell);
  ui.selected = null;
  if (!ok) { ui.busy = false; sync(); return; }
  sync();
  if (state.phase === 'over') { ui.screen = 'end'; ui.busy = false; sync(); return; }
  // The Warden thinks, shows its intent, then plays.
  const move = chooseMove(state, rng);
  ui.intent = move ? move.intent : 'The Warden has no move.';
  sync();
  setTimeout(() => {
    if (move !== null) {
      placeCard(state, 'foe', move.handIndex, move.cell);
      endTurn(state);
    }
    ui.busy = false;
    if (state.phase === 'over') ui.screen = 'end';
    else ui.intent = 'Your move, Keeper. Place a sigil.';
    sync();
  }, 650);
}

// --- input: mouse ---
document.getElementById('grid').addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  ui.cursor = Number(cell.dataset.cell);
  tryPlace(ui.cursor);
});
document.getElementById('hand').addEventListener('click', (event) => {
  const btn = event.target.closest('.hand-card');
  if (!btn) return;
  const h = Number(btn.dataset.hand);
  ui.selected = ui.selected === h ? null : h;
  sync();
});
document.getElementById('title-screen').addEventListener('click', () => {
  if (ui.screen === 'title') startGame();
});
document.getElementById('end-screen').addEventListener('click', () => {
  if (ui.screen === 'end') startGame();
});

// --- input: keyboard ---
document.addEventListener('keydown', (event) => {
  if (ui.screen === 'title' && (event.key === 'Enter' || event.key === ' ')) { startGame(); return; }
  if (ui.screen === 'end' && (event.key === 'r' || event.key === 'R' || event.key === 'Enter')) { startGame(); return; }
  if (ui.screen !== 'play') return;
  const key = event.key;
  if (key >= '1' && key <= '4') {
    const h = Number(key) - 1;
    if (h < state.you.hand.length) ui.selected = ui.selected === h ? null : h;
    sync();
    return;
  }
  if (key === 'Escape') { ui.selected = null; sync(); return; }
  const row = Math.floor(ui.cursor / 3);
  const col = ui.cursor % 3;
  if (key === 'ArrowLeft') ui.cursor = row * 3 + Math.max(0, col - 1);
  else if (key === 'ArrowRight') ui.cursor = row * 3 + Math.min(2, col + 1);
  else if (key === 'ArrowUp') ui.cursor = Math.max(0, row - 1) * 3 + col;
  else if (key === 'ArrowDown') ui.cursor = Math.min(2, row + 1) * 3 + col;
  else if (key === 'Enter') { tryPlace(ui.cursor); return; }
  else return;
  sync();
});

// --- shot scenes ---
if (shot !== null) {
  const shotUi = applyShot(state, rng, shot);
  ui = { ...ui, ...shotUi, busy: false };
  if (state.phase === 'over') ui.screen = 'end';
  sync();
  window.__shotReady = true;
} else {
  sync();
  window.__shotReady = true;
}
