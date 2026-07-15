---
title: Score Calculator
description: Tableside Skull King voyage scoring on one device — setup, rounds, and events.
audience: user
game: skull-king
section: app
order: 2
---

# Score Calculator

Routes:

- `/games/skull-king/calculator` — voyage home
- `/games/skull-king/calculator/setup` — host wizard
- `/games/skull-king/calculator/round` — per-round scoring

Track bids, tricks, and bonuses on **one device** while playing with a physical deck.

## Before you start

- One phone or tablet at the table.
- Crew names and player count (3–8).
- Choose **round schema** and **artifacts** to match your table rules.

## Setup wizard

1. Open **Score Calculator** from the [hub](./hub.md).
2. **Crew** — player count and names.
3. **Rounds schema** — preset or custom comma-separated hand sizes (see [Round presets](../rules/09-round-presets.md)).
4. **Artifacts** — beginner / intermediate / expert or custom toggles ([matrix](../reference/artifacts-matrix.md)).
5. Start the voyage.

Setup choices persist locally for the next session.

## Scoring a round

For each round:

1. Note **hand size** (from schema).
2. Enter each player's **bid** and **tricks won**.
3. Add **events** as they occur:
   - **14-Bonus** — suit of the fourteen collected
   - **Hero capture** — pirate / king / mermaid captures
   - **Loot alliance** — linked players
   - **Pirate abilities** — Rascal wager; Harry bid ±1
4. Confirm round — points computed from [score-rules.ts](https://github.com/alirezaopmc/gub/blob/main/src/lib/games/skull-king/round-score/score-rules.ts).

### Harry the Giant

Use **B+1 / B−1** on a player's bid row after Harry's ability — adjusts effective bid for scoring.

### Rascal of Roatan

Log wager (10 or 20) as a pirate ability event on the owner's row.

## Between rounds

Navigate **prev / next** round. Running totals accumulate on the scoreboard.

## End of voyage

Compare totals. Ties = shared victory.

## When to prefer Calculator over Play

| Use Calculator | Use Play |
|----------------|----------|
| Physical Grandpa Beck deck | All players on devices |
| House-rule event logging | Engine enforces legal moves |
| No server dependency for play itself | Real-time synchronized state |

## Related

- [Scoring quick reference](../reference/scoring-quick-ref.md)
- [Scoring rules](../rules/06-scoring.md)
- [Artifacts matrix](../reference/artifacts-matrix.md)
