// Screenshot scenes: ?shot=start|play|win|lose&seed=N. Each one plays the real
// rules forward from a fresh game, steered by the same autopilots a player
// faces, so the frame is what a real game looks like and the same seed always
// gives the same frame. No state is faked: the win scene wins by the rules,
// the loss scene loses by them.
import { placeCard, emptyCells, endTurn } from './engine.js';
import { chooseMove, choosePlayerMove } from './ai.js';
import { pick } from './rng.js';

function playRound(state, rng, foeWeak) {
  // One full round: you, then the Warden. Returns false when the game ends.
  const yours = choosePlayerMove(state, rng);
  if (yours === null) return false;
  placeCard(state, 'you', yours.handIndex, yours.cell);
  if (state.phase === 'over') return false;
  let foes;
  if (foeWeak) {
    // A hurried Warden: weakest card, random cell.
    const empties = emptyCells(state);
    if (empties.length === 0) return false;
    let weakest = 0;
    for (let h = 1; h < state.foe.hand.length; h += 1) {
      if (state.foe.hand[h].power < state.foe.hand[weakest].power) weakest = h;
    }
    foes = { handIndex: weakest, cell: pick(empties, rng), intent: 'The Warden plays carelessly.' };
  } else {
    foes = chooseMove(state, rng);
  }
  if (foes === null) return false;
  placeCard(state, 'foe', foes.handIndex, foes.cell);
  if (state.phase === 'over') return false;
  endTurn(state);
  return true;
}

function playUntilOver(state, rng, foeWeak, maxTurns) {
  for (let t = 0; t < maxTurns && state.phase !== 'over'; t += 1) {
    if (!playRound(state, rng, foeWeak)) break;
  }
  return state;
}

// Run the requested scene and return the ui screen it lands on.
export function applyShot(state, rng, shot) {
  if (shot === 'play') {
    // A composed mid-game tableau, played forward through the real rules:
    // eight legal moves in a fixed script, the first three completing the top
    // row (a score in the log), the next five rebuilding a full table. No
    // state is faked — every card here was drawn, placed and scored by the
    // engine. The script picks its card by element from the hand it was
    // dealt, so the same seed always deals the same tableau; a step whose
    // cell is taken or whose element is missing falls back to the autopilot.
    const script = [
      ['you', 'ember', 0], ['foe', 'tide', 1], ['you', 'thorn', 2],
      ['foe', 'gale', 0], ['you', 'tide', 1], ['foe', 'ember', 3],
      ['you', 'gale', 5], ['foe', 'thorn', 7],
    ];
    for (const [owner, element, cell] of script) {
      if (state.phase === 'over') break;
      const side = owner === 'you' ? state.you : state.foe;
      let move = null;
      if (state.grid[cell] === null && side.hand.length > 0) {
        let handIndex = side.hand.findIndex((c) => c.element === element);
        if (handIndex < 0) {
          handIndex = 0;
          for (let h = 1; h < side.hand.length; h += 1) {
            if (side.hand[h].power > side.hand[handIndex].power) handIndex = h;
          }
        }
        move = { handIndex, cell };
      }
      if (move === null) {
        move = owner === 'you' ? choosePlayerMove(state, rng) : chooseMove(state, rng);
        if (move === null) break;
      }
      placeCard(state, owner, move.handIndex, move.cell);
      if (state.phase === 'over') break;
      if (owner === 'foe') endTurn(state);
    }
    const next = state.phase === 'over' ? null : chooseMove(state, rng);
    return { screen: 'play', intent: next ? next.intent : 'The Warden waits.', selected: null, cursor: 4 };
  }
  if (shot === 'win') {
    playUntilOver(state, rng, true, 80);
    return { screen: 'end', intent: '', selected: null, cursor: 4 };
  }
  if (shot === 'lose') {
    // The Warden plays sharp and you play careless: weakest card, random cell.
    for (let t = 0; t < 80 && state.phase !== 'over'; t += 1) {
      const empties = emptyCells(state);
      if (empties.length === 0) break;
      let weakest = 0;
      for (let h = 1; h < state.you.hand.length; h += 1) {
        if (state.you.hand[h].power < state.you.hand[weakest].power) weakest = h;
      }
      placeCard(state, 'you', weakest, pick(empties, rng));
      if (state.phase === 'over') break;
      const foes = chooseMove(state, rng);
      if (foes === null) break;
      placeCard(state, 'foe', foes.handIndex, foes.cell);
      if (state.phase === 'over') break;
      endTurn(state);
    }
    return { screen: 'end', intent: '', selected: null, cursor: 4 };
  }
  // 'start' and anything unknown: the title screen over a fresh table.
  return { screen: 'title', intent: 'The Warden waits.', selected: null, cursor: 4 };
}
