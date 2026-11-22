// The table: DOM rendering for EMBERGRID. All state lives in the engine; this
// file only paints it — life bars, hands, the 3x3 grid, the log and the title
// and end screens — and flashes the flourishes (a line scoring, a number
// floating up) on top. With ?shot= present the page adds .noanim, so the
// screenshots catch the frame exactly as the rules left it.
import { ELEMENTS } from './cards.js';
import { LINES } from './engine.js';

let root = null;
let els = {};

function cardHtml(card, owner) {
  const el = ELEMENTS[card.element];
  return `<div class="card el-${card.element} owner-${owner}" data-card="${card.id}">
    <div class="card-power">${card.power}</div>
    <div class="card-glyph" style="color:${el.color}">${el.glyph}</div>
    <div class="card-name">${el.name}</div>
    <div class="card-gift">${card.gift}</div>
  </div>`;
}

function cardBackHtml() {
  return `<div class="card card-back"><div class="card-back-glyph">✦</div><div class="card-back-name">SIGIL</div></div>`;
}

function lifeBar(side, label) {
  const pct = Math.max(0, (side.life / 30) * 100);
  const shield = side.shield > 0 ? `<span class="shield">🛡 ${side.shield}</span>` : '';
  return `<div class="lifebar-wrap">
    <div class="lifebar-label">${label} ${shield}</div>
    <div class="lifebar"><div class="lifebar-fill" style="width:${pct}%"></div>
    <div class="lifebar-num">${side.life} / 30</div></div>
  </div>`;
}

export function buildStatic() {
  root = document.getElementById('app');
  root.innerHTML = `
  <div class="table">
    <header class="foe-row">
      <div class="avatar foe-avatar">W</div>
      <div class="foe-info">
        <div class="foe-name">THE HOLLOW WARDEN</div>
        <div class="foe-hand" id="foe-hand"></div>
      </div>
      <div class="foe-life" id="foe-life"></div>
      <div class="deck-pile" id="foe-deck"></div>
    </header>
    <div class="intent" id="intent">The Warden waits.</div>
    <main class="middle">
      <section class="grid-wrap">
        <div class="grid" id="grid"></div>
        <div class="turn-line" id="turn-line"></div>
      </section>
      <aside class="side">
        <div class="side-title">THE GRIMOIRE</div>
        <div class="legend">
          <div><span class="lg" style="color:#e5484d">▲</span> Ember — scorch 1</div>
          <div><span class="lg" style="color:#3e9bff">●</span> Tide — mend 2</div>
          <div><span class="lg" style="color:#46a758">◆</span> Thorn — shield 2</div>
          <div><span class="lg" style="color:#f5a524">✦</span> Gale — draw 1</div>
        </div>
        <div class="side-rule">When a row, column or diagonal fills, the side holding most of its cards scores their power as damage. Three of one element: <b>RESONANCE</b> — double damage, +4 life.</div>
        <div class="log" id="log"></div>
      </aside>
    </main>
    <footer class="you-row">
      <div class="avatar you-avatar">K</div>
      <div class="you-info">
        <div class="you-name">YOU — THE KEEPER</div>
        <div class="hand" id="hand"></div>
      </div>
      <div class="you-life" id="you-life"></div>
      <div class="deck-pile" id="you-deck"></div>
    </footer>
    <div class="hint" id="hint">Click a card, then a glowing cell — or press 1–4, arrows, Enter.</div>
  </div>
  <div class="overlay" id="title-screen">
    <div class="title-card">
      <div class="title-glyphs"><span style="color:#e5484d">▲</span> <span style="color:#3e9bff">●</span> <span style="color:#46a758">◆</span> <span style="color:#f5a524">✦</span></div>
      <h1>EMBERGRID</h1>
      <div class="subtitle">A duel of sigils on a 3 × 3 grid</div>
      <p class="title-rules">You and the Hollow Warden take turns placing sigil cards on one shared grid.
      When a row, column or diagonal fills, the side holding most of its cards
      scores their power as damage. Three of one element is <b>RESONANCE</b> — double
      damage, +4 life. First lantern to gutter out loses.</p>
      <div class="title-cta">Click or press Enter to begin</div>
      <div class="title-foot">30 life each · 24 sigils · 4 elements · no luck but the draw</div>
    </div>
  </div>
  <div class="overlay hidden" id="end-screen">
    <div class="title-card">
      <h1 id="end-title">VICTORY</h1>
      <div class="subtitle" id="end-sub"></div>
      <div class="end-stats" id="end-stats"></div>
      <div class="title-cta">Press R to play again</div>
    </div>
  </div>
  <div class="floaters" id="floaters"></div>`;
  els = {
    grid: document.getElementById('grid'),
    hand: document.getElementById('hand'),
    foeHand: document.getElementById('foe-hand'),
    youLife: document.getElementById('you-life'),
    foeLife: document.getElementById('foe-life'),
    youDeck: document.getElementById('you-deck'),
    foeDeck: document.getElementById('foe-deck'),
    intent: document.getElementById('intent'),
    turnLine: document.getElementById('turn-line'),
    log: document.getElementById('log'),
    title: document.getElementById('title-screen'),
    end: document.getElementById('end-screen'),
    endTitle: document.getElementById('end-title'),
    endSub: document.getElementById('end-sub'),
    endStats: document.getElementById('end-stats'),
    floaters: document.getElementById('floaters'),
    hint: document.getElementById('hint'),
  };
  // The nine cells, each a button so keyboard play works.
  for (let i = 0; i < 9; i += 1) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.type = 'button';
    cell.dataset.cell = String(i);
    cell.setAttribute('aria-label', `Grid cell ${i + 1}`);
    els.grid.appendChild(cell);
  }
}

function renderGrid(state, ui) {
  const cells = els.grid.children;
  for (let i = 0; i < 9; i += 1) {
    const cell = cells[i];
    const placed = state.grid[i];
    cell.classList.toggle('empty', placed === null);
    cell.classList.toggle('filled', placed !== null);
    cell.classList.toggle('hot', ui.selected !== null && placed === null);
    cell.classList.toggle('cursor', ui.cursor === i);
    cell.classList.toggle('scored', state.lastScored.includes(i));
    cell.innerHTML = placed ? cardHtml(placed.card, placed.owner) : '';
  }
}

function renderHand(state, ui) {
  els.hand.innerHTML = state.you.hand
    .map((card, h) => {
      const sel = ui.selected === h ? ' selected' : '';
      return `<button type="button" class="hand-card${sel}" data-hand="${h}" aria-label="Hand card ${h + 1}: ${card.name}">${cardHtml(card, 'you')}</button>`;
    })
    .join('');
  els.foeHand.innerHTML = state.foe.hand.map(() => cardBackHtml()).join('');
}

function renderLife(state) {
  els.youLife.innerHTML = lifeBar(state.you, 'YOUR LIFE');
  els.foeLife.innerHTML = lifeBar(state.foe, 'WARDEN LIFE');
  els.youDeck.innerHTML = `<div class="pile-label">DECK ${state.you.deck.length}</div><div class="pile-sub">DISCARD ${state.you.discard.length}</div>`;
  els.foeDeck.innerHTML = `<div class="pile-label">DECK ${state.foe.deck.length}</div><div class="pile-sub">DISCARD ${state.foe.discard.length}</div>`;
}

function renderLog(state) {
  const tail = state.log.slice(-7);
  els.log.innerHTML = tail.map((line) => `<div class="log-line">${line}</div>`).join('');
  els.log.scrollTop = els.log.scrollHeight;
}

export function floatDamage(state) {
  if (!state.lastDamage) return;
  const { side, amount, resonance } = state.lastDamage;
  const el = document.createElement('div');
  el.className = `floater ${side === 'foe' ? 'foe-hit' : 'you-hit'}${resonance ? ' resonance' : ''}`;
  el.textContent = `−${amount}${resonance ? ' RESONANCE' : ''}`;
  els.floaters.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  state.lastDamage = null;
}

export function render(state, ui) {
  renderGrid(state, ui);
  renderHand(state, ui);
  renderLife(state);
  renderLog(state);
  els.intent.textContent = ui.intent || 'The Warden waits.';
  els.turnLine.textContent = `TURN ${state.turn}  ·  ${state.you.hand.length} cards in hand  ·  ${emptyCount(state)} empty cells`;
  els.title.classList.toggle('hidden', ui.screen !== 'title');
  els.end.classList.toggle('hidden', ui.screen !== 'end');
  if (ui.screen === 'end' && state.winner) {
    const won = state.winner === 'you';
    els.endTitle.textContent = won ? 'VICTORY' : 'THE LANTERN DIES';
    els.endTitle.style.color = won ? '#ffd98a' : '#e5484d';
    els.endSub.textContent = won
      ? 'The Warden\u2019s lantern gutters out. The grid is yours.'
      : 'The Warden takes the grid. Your light goes out.';
    els.endStats.innerHTML = `
      <div>Turns played <b>${state.turn}</b></div>
      <div>Lines scored <b>${state.stats.lines}</b> · Resonances <b>${state.stats.resonances}</b></div>
      <div>Damage dealt <b>${state.stats.damageDealt}</b> · Damage taken <b>${state.stats.damageTaken}</b></div>
      <div>Life left <b>${state.you.life} — ${state.foe.life}</b></div>`;
  }
}

function emptyCount(state) {
  let n = 0;
  for (let i = 0; i < 9; i += 1) if (state.grid[i] === null) n += 1;
  return n;
}

// Line names for the outline the judge reads.
export function describeLines() {
  return LINES.map((line, i) => `line ${i}: cells ${line.join(', ')}`).join('; ');
}
