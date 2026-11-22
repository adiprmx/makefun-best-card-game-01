// The deck of EMBERGRID: 24 sigil cards in four elements. Every card has an
// element, a power (1-5) and a placement gift — a small effect that fires the
// moment the card lands on the grid. Power is what a filled line scores: the
// side holding most of a line's cards deals their power as damage, so a line
// is worth roughly 7-13 life against 30 life each.
//
// Elements, told apart by colour AND shape, never by text alone:
//   Ember  red     triangle  ▲  gift: scorch the foe for 1
//   Tide   blue    circle    ●  gift: mend 2 of your own life
//   Thorn  green   diamond   ◆  gift: raise 2 shield
//   Gale   amber   star      ✦  gift: draw one more card
export const ELEMENTS = {
  ember: { name: 'Ember', glyph: '▲', color: '#e5484d', soft: '#f5a3a6', gift: 'Scorch 1' },
  tide: { name: 'Tide', glyph: '●', color: '#3e9bff', soft: '#a8d2ff', gift: 'Mend 2' },
  thorn: { name: 'Thorn', glyph: '◆', color: '#46a758', soft: '#a5ddb0', gift: 'Shield 2' },
  gale: { name: 'Gale', glyph: '✦', color: '#f5a524', soft: '#ffd98a', gift: 'Draw 1' },
};

export const ELEMENT_KEYS = ['ember', 'tide', 'thorn', 'gale'];

// Powers per element: six cards each, 1..5 with the middle weights doubled.
const POWERS = [2, 3, 3, 4, 4, 5];

let serial = 0;

export function makeCard(element, power) {
  serial += 1;
  return {
    id: `c${serial}`,
    element,
    power,
    name: `${ELEMENTS[element].name} ${power}`,
    gift: ELEMENTS[element].gift,
  };
}

// A fresh 24-card deck, in a fixed order; the caller shuffles it with a seeded rng.
export function buildDeck() {
  serial = 0;
  const deck = [];
  for (const element of ELEMENT_KEYS) {
    for (const power of POWERS) deck.push(makeCard(element, power));
  }
  return deck;
}
