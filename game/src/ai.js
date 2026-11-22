// The Warden's mind: a readable opponent. It plays in plain sight — it fills
// lines it holds, never hands you a line you hold, chases resonance, and says
// what it is eyeing, so every one of its moves can be read and countered.
//
// A line scores when it fills: the side holding most of its cards scores
// their power as damage. So the Warden wants to fill lines it holds, wants
// to fill split lines (they tip to it), and never fills a line you hold.
import { LINES, LINE_NAMES, emptyCells } from './engine.js';

// For each line, how many cards each side holds there and which cells are open.
function lineShape(state, line) {
  let you = 0;
  let foe = 0;
  const open = [];
  for (const i of line) {
    const cell = state.grid[i];
    if (cell === null) open.push(i);
    else if (cell.owner === 'you') you += 1;
    else foe += 1;
  }
  return { you, foe, open };
}

// Would filling `cell` complete a line the player holds? Never do that.
function handsYouALine(state, cell) {
  for (const line of LINES) {
    if (!line.includes(cell)) continue;
    const shape = lineShape(state, line);
    if (shape.you === 2 && shape.open.length === 1 && shape.open[0] === cell) return true;
  }
  return false;
}

// How good is this empty cell for `owner`: lines through it where the owner
// already stands and the enemy does not are ground worth taking — a line
// one card from filling is worth more than fresh ground.
function cellValue(state, cell, owner) {
  let value = 0;
  for (const line of LINES) {
    if (!line.includes(cell)) continue;
    const shape = lineShape(state, line);
    const mine = owner === 'foe' ? shape.foe : shape.you;
    const theirs = owner === 'foe' ? shape.you : shape.foe;
    if (theirs === 0 && mine === 1) value += 3;
    else if (theirs === 0 && mine === 0) value += 1;
    else if (mine === 1 && theirs === 1) value += 1;
  }
  if (cell === 4) value += 1; // the heart sits on four lines
  return value;
}

// The best empty cell for `owner` by cellValue, never one that hands the
// enemy a line it holds; ties go to the lowest index, so it stays deterministic.
function bestCell(state, owner, rng) {
  const empties = emptyCells(state);
  const safe = empties.filter((i) => {
    for (const line of LINES) {
      if (!line.includes(i)) continue;
      const shape = lineShape(state, line);
      if (owner === 'foe') {
        if (shape.you === 2 && shape.open.length === 1 && shape.open[0] === i) return false;
      } else if (shape.foe === 2 && shape.open.length === 1 && shape.open[0] === i) return false;
    }
    return true;
  });
  const pool = safe.length > 0 ? safe : empties;
  let best = pool[0];
  let bestValue = cellValue(state, best, owner);
  for (const cell of pool) {
    const value = cellValue(state, cell, owner);
    if (value > bestValue) { best = cell; bestValue = value; }
  }
  return best;
}

// Pick a card for `cell`: one matching the element already standing on a
// line through it (resonance brewing), else the strongest in hand.
function cardForCell(state, owner, cell) {
  const hand = owner === 'foe' ? state.foe.hand : state.you.hand;
  for (const line of LINES) {
    if (!line.includes(cell)) continue;
    const placed = line.map((i) => state.grid[i]).find((c) => c !== null && c.owner === owner);
    if (placed) {
      const same = hand.findIndex((card) => card.element === placed.card.element);
      if (same >= 0) return same;
    }
  }
  return strongestCard(hand);
}

function strongestCard(hand) {
  let best = 0;
  for (let h = 1; h < hand.length; h += 1) {
    if (hand[h].power > hand[best].power) best = h;
  }
  return best;
}

// Choose the Warden's move: { handIndex, cell, intent }.
export function chooseMove(state, rng) {
  const empties = emptyCells(state);
  if (empties.length === 0) return null;
  const hand = state.foe.hand;
  const bestHand = strongestCard(hand);

  // 1. Fill a line I hold (two of mine, one open): it scores my cards.
  // Prefer the finish with a card matching the line's element (resonance).
  for (let li = 0; li < LINES.length; li += 1) {
    const shape = lineShape(state, LINES[li]);
    if (shape.foe === 2 && shape.open.length === 1) {
      const placed = LINES[li].map((i) => state.grid[i]).find((c) => c !== null);
      const same = hand
        .map((card, h) => ({ card, h }))
        .filter((x) => x.card.element === placed.card.element);
      const handIndex = same.length > 0 ? same[0].h : bestHand;
      const resonance = same.length > 0 ? ' — resonance!' : '';
      return { handIndex, cell: shape.open[0], intent: `The Warden closes the ${LINE_NAMES[li]}${resonance}` };
    }
  }

  // 2. Fill a split line (one each): it tips to me and scores my two.
  for (let li = 0; li < LINES.length; li += 1) {
    const shape = lineShape(state, LINES[li]);
    if (shape.foe === 1 && shape.you === 1 && shape.open.length === 1) {
      return { handIndex: bestHand, cell: shape.open[0], intent: `The Warden tips the ${LINE_NAMES[li]} its way.` };
    }
  }

  // 3. Take the best ground: the cell worth most by the lines through it,
  // with a card to match what already stands there when I can.
  const cell = bestCell(state, 'foe', rng);
  const handIndex = cardForCell(state, 'foe', cell);
  const intent = cell === 4 && state.grid[4] === null
    ? 'The Warden takes the heart of the grid.'
    : 'The Warden presses where the lines run.';
  return { handIndex, cell, intent };
}

// A fair move for the player's autopilot in screenshots: the same shape as
// the Warden's, no peeking — fill what I hold, tip split lines, take the
// best ground, never hand the Warden a line it holds.
export function choosePlayerMove(state, rng) {
  const empties = emptyCells(state);
  if (empties.length === 0) return null;
  const hand = state.you.hand;
  const bestHand = strongestCard(hand);
  for (let li = 0; li < LINES.length; li += 1) {
    const shape = lineShape(state, LINES[li]);
    if (shape.you === 2 && shape.open.length === 1) return { handIndex: bestHand, cell: shape.open[0] };
  }
  for (let li = 0; li < LINES.length; li += 1) {
    const shape = lineShape(state, LINES[li]);
    if (shape.you === 1 && shape.foe === 1 && shape.open.length === 1) return { handIndex: bestHand, cell: shape.open[0] };
  }
  const cell = bestCell(state, 'you', rng);
  return { handIndex: cardForCell(state, 'you', cell), cell };
}
