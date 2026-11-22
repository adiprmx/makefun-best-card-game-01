// The rules of EMBERGRID: a shared 3x3 grid, one card a turn each, lines of
// three score. Pure state, no DOM here, so the autopilot and the screenshots
// can drive the same rules the player plays.
import { buildDeck } from './cards.js';
import { shuffle } from './rng.js';

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6], // diagonals
];

export const LINE_NAMES = [
  'top row', 'middle row', 'bottom row',
  'left column', 'middle column', 'right column',
  'falling diagonal', 'rising diagonal',
];

export const START_LIFE = 30;
export const HAND_SIZE = 4;

export function newGame(seed, rng) {
  const deck = shuffle(buildDeck(), rng);
  const half = deck.length / 2;
  const state = {
    seed,
    rng, // kept so reshuffles stay deterministic under the same seed
    grid: Array(9).fill(null), // null or { owner: 'you'|'foe', card }
    you: { life: START_LIFE, shield: 0, hand: [], deck: deck.slice(0, half), discard: [] },
    foe: { life: START_LIFE, shield: 0, hand: [], deck: deck.slice(half), discard: [] },
    turn: 1,
    phase: 'play', // 'play' | 'over'
    winner: null, // 'you' | 'foe'
    log: [],
    stats: { lines: 0, resonances: 0, damageDealt: 0, damageTaken: 0, turns: 0 },
    lastScored: [], // cells of the most recent scoring line, for the flash
    lastDamage: null, // { side, amount, resonance } for the floating number
  };
  drawUp(state.you, state);
  drawUp(state.foe, state);
  return state;
}

function drawUp(side, state) {
  while (side.hand.length < HAND_SIZE) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffle(side.discard, state.rng);
      side.discard = [];
    }
    side.hand.push(side.deck.pop());
  }
}

export function emptyCells(state) {
  const out = [];
  for (let i = 0; i < 9; i += 1) if (state.grid[i] === null) out.push(i);
  return out;
}

// Damage first eats shield, then life. Returns the life actually lost.
export function dealDamage(state, side, amount) {
  const target = side === 'you' ? state.you : state.foe;
  let left = amount;
  if (target.shield > 0) {
    const eaten = Math.min(target.shield, left);
    target.shield -= eaten;
    left -= eaten;
  }
  target.life = Math.max(0, target.life - left);
  return left;
}

function heal(state, side, amount) {
  const target = side === 'you' ? state.you : state.foe;
  target.life = Math.min(START_LIFE, target.life + amount);
}

function applyGift(state, owner, card) {
  if (card.element === 'ember') {
    const hurt = dealDamage(state, owner === 'you' ? 'foe' : 'you', 1);
    if (owner === 'you') state.stats.damageDealt += hurt;
    else state.stats.damageTaken += hurt;
    state.log.push(`Ember ${card.power} scorches the ${owner === 'you' ? 'Warden' : 'Keeper'} for 1.`);
  } else if (card.element === 'tide') {
    heal(state, owner, 2);
    state.log.push(`${owner === 'you' ? 'You mend' : 'The Warden mends'} 2 life on the Tide.`);
  } else if (card.element === 'thorn') {
    const target = owner === 'you' ? state.you : state.foe;
    target.shield += 2;
    state.log.push(`${owner === 'you' ? 'You raise' : 'The Warden raises'} 2 shield on the Thorn.`);
  }
  // Gale's gift (draw 1) is handled by the caller through drawUp, after placement.
}

// Score every line that just filled up. A line of three cards always has a
// majority owner (two or three cards): that side scores the power of ITS
// cards in the line. Three cards of one element is RESONANCE: the damage
// doubles and the scorer mends 4 life. The line then clears, freeing cells.
export function scoreLines(state, owner) {
  const scored = [];
  for (let li = 0; li < LINES.length; li += 1) {
    const line = LINES[li];
    const cells = line.map((i) => state.grid[i]);
    if (cells.some((c) => c === null)) continue;
    const yours = cells.filter((c) => c.owner === 'you');
    const foes = cells.filter((c) => c.owner === 'foe');
    const majority = yours.length >= 2 ? 'you' : 'foe';
    const held = majority === 'you' ? yours : foes;
    const sum = held.reduce((total, c) => total + c.card.power, 0);
    const resonance = cells[0].card.element === cells[1].card.element
      && cells[1].card.element === cells[2].card.element;
    const damage = resonance ? sum * 2 : sum;
    const enemy = majority === 'you' ? 'foe' : 'you';
    const hurt = dealDamage(state, enemy, damage);
    if (majority === 'you') state.stats.damageDealt += hurt;
    else state.stats.damageTaken += hurt;
    if (resonance) {
      heal(state, majority, 4);
      state.stats.resonances += 1;
      state.log.push(`RESONANCE! A ${cells[0].card.element} line burns twice — ${damage} damage to the ${enemy === 'foe' ? 'Warden' : 'Keeper'}, +4 life.`);
    } else {
      state.log.push(`${majority === 'you' ? 'You hold' : 'The Warden holds'} the ${LINE_NAMES[li]} ${held.length}–${3 - held.length} and ${majority === 'you' ? 'score' : 'scores'} ${damage}.`);
    }
    state.stats.lines += 1;
    state.lastScored = line.slice();
    state.lastDamage = { side: enemy, amount: damage, resonance };
    scored.push({ line: line.slice(), name: LINE_NAMES[li], damage, resonance });
    for (const i of line) {
      const side = state.grid[i].owner === 'you' ? state.you : state.foe;
      side.discard.push(state.grid[i].card);
      state.grid[i] = null;
    }
  }
  return scored;
}

export function checkOver(state) {
  if (state.foe.life <= 0) {
    state.phase = 'over';
    state.winner = 'you';
    state.log.push('The Warden\u2019s lantern gutters out. Victory is yours.');
  } else if (state.you.life <= 0) {
    state.phase = 'over';
    state.winner = 'foe';
    state.log.push('Your lantern dies. The Warden takes the grid.');
  }
  return state.phase === 'over';
}

// Play one card from a side's hand onto a cell. Returns false when illegal.
export function placeCard(state, owner, handIndex, cell) {
  if (state.phase !== 'play') return false;
  if (cell < 0 || cell > 8 || state.grid[cell] !== null) return false;
  const side = owner === 'you' ? state.you : state.foe;
  const card = side.hand[handIndex];
  if (!card) return false;
  side.hand.splice(handIndex, 1);
  state.grid[cell] = { owner, card };
  state.log.push(`${owner === 'you' ? 'You place' : 'The Warden places'} ${card.name} on cell ${cell + 1}.`);
  applyGift(state, owner, card);
  if (card.element === 'gale') {
    drawUp(side, state);
    state.log.push('Gale draws an extra card.');
  }
  scoreLines(state, owner);
  if (checkOver(state)) return true;
  // A full grid with no line scored stalls the duel: the fuller lantern wins.
  if (emptyCells(state).length === 0) {
    state.phase = 'over';
    state.winner = state.you.life >= state.foe.life ? 'you' : 'foe';
    state.log.push('The grid is full. The fuller lantern wins.');
    return true;
  }
  drawUp(side, state);
  return true;
}

// Advance the turn counter after both sides have moved.
export function endTurn(state) {
  state.turn += 1;
  state.stats.turns = state.turn;
}
