---
title: Pirate abilities
description: Expert expansion — unique power for each Pirate when you win a trick with it.
audience: player
game: skull-king
section: rules
order: 8
artifacts:
  - PirateAbilities
source: src/lib/games/skull-king/engine/pirate-abilities.ts
---

# Pirate abilities

When **Pirate Abilities** are enabled, each Pirate has a unique skill.

## How to use an ability

1. **Win a trick** by playing that Pirate (not by capturing an opponent's Pirate).
2. Use the ability **immediately** — it does not carry to the next round.
3. Most abilities **cannot** be used on the **final trick** of the round. **Harry the Giant** is the exception.

## The five pirates

### Rosie D'Laney

Choose any player (including yourself) to **lead the next trick**.

- Cannot be used on the final trick.

### Bendt the Bandit

**Draw 2** cards from the undealt deck, then **discard 2** from your hand.

- Cannot be used on the final trick.

### Rascal of Roatan

Make a side **wager** of **0, 10, or 20** points.

- If you make your bid: **+wager**
- If you miss: **−wager**
- Cannot be used on the final trick.

### Juanita Jade

**Peek** at the undealt cards (cards not in play this round).

- Cannot be used on the final trick.

### Harry the Giant

**Increase or decrease** your bid by **1** for scoring (clamped to valid range).

- **Allowed on the final trick.**

## In GUB Calculator

- Harry: B+1 / B−1 marker next to bid.
- Rascal: wager logged as a round event.
- Play mode resolves abilities per engine when enabled.

## Related

- [Scoring](./06-scoring.md) — Rascal wager math
- [Artifacts matrix](../reference/artifacts-matrix.md)
- [FAQ](./10-faq.md)
