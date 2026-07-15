---
title: Round presets
description: Hand-size sequences for a Skull King voyage — default and rulebook variants.
audience: player
game: skull-king
section: rules
order: 9
source: src/lib/games/skull-king/rounds-schema.ts
---

# Round presets

A **round schema** is the sequence of hand sizes dealt each round (comma-separated in GUB setup).

## Default

Full voyage: **1, 2, 3, 4, 5, 6, 7, 8, 9, 10** (10 rounds).

## Rulebook presets (page 14)

| Preset | Hand sizes | Character |
|--------|------------|-----------|
| **Even Keeled** | 2, 4, 6, 8, 10 | Steady climb |
| **Skip to the Brawl** | 6, 7, 8, 9, 10 | Short game, big hands |
| **Swift-n-Salty Skirmish** | 5, 5, 5, 5, 5 | Fixed hand size |
| **Broadside Barrage** | 10 × 10 | Ten rounds at max hand |
| **Whirlpool** | 9, 9, 7, 7, 5, 5, 3, 3, 1, 1 | Rising and falling |
| **Past Your Bedtime** | 1 | Single-round micro game |

## Other built-in presets

| Preset | Hand sizes |
|--------|------------|
| Odds | 1, 3, 5, 7, 9 |
| Evens | 2, 4, 6, 8, 10 |
| Rich | 6, 7, 8, 9, 10 |

## Custom schema

Enter any comma-separated positive integers in Calculator setup (e.g. `1,2,2,5,5`). Invalid tokens are skipped when parsed.

## In GUB

- **Calculator setup** — choose or edit rounds schema.
- **Play** — uses config from match creation.
- In-app docs page lists Default, Even Keeled, Whirlpool, Swift Skirmish presets.

## Related

- [Setup & deck](./01-setup-deck.md)
- [Calculator guide](../app/calculator.md)
