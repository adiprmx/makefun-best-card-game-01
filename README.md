# makefun-best-card-game-01

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/adiprmx/makefun-best-card-game-01/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/adiprmx/makefun-best-card-game-01/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**EMBERGRID** — a duel of sigils on a shared 3 × 3 grid. You and the Hollow Warden take turns placing sigil cards; when a row, column or diagonal fills, the side holding most of its cards scores their power as damage. Three of one element is **RESONANCE** — double damage, +4 life. Four elements (Ember scorches, Tide mends, Thorn shields, Gale draws), each told apart by colour and shape. The Warden shows its intent before every move, so every one of its plays can be read and countered. 30 life each, first lantern out loses.

## Play it

Serve `game/` with any static server and open `game/index.html` in desktop Chrome (no network needed):

```sh
cd game && python3 -m http.server 8080
```

Click a card in your hand, then a glowing cell — or press 1–4 to pick a card, arrow keys to move, Enter to place. `R` restarts after a win or loss. Screenshot scenes: `?shot=start|play|win|lose&seed=1`.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=1c6jcmp6&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
