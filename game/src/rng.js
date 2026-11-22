// Seeded RNG for EMBERGRID: mulberry32, small and deterministic, so a shot with
// ?seed=N always plays the same game. The live game seeds from the clock; the
// screenshot scenes seed from the URL, which is what makes them reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle driven by a supplied rng, so deck order is reproducible.
export function shuffle(deck, rng) {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Pick one of `items` with the rng, or null when empty.
export function pick(items, rng) {
  if (items.length === 0) return null;
  return items[Math.floor(rng() * items.length)];
}
