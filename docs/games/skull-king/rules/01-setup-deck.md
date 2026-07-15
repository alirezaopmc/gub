---
title: Setup & deck
description: Skull King deck contents, player counts, and dealing rules.
audience: player
game: skull-king
section: rules
order: 1
source: src/lib/games/skull-king/engine/deck.ts
---

# Setup & deck

## Player count

- **3–8 players** in GUB Play mode.
- Calculator supports the same range for tableside scoring.

## Deck contents

### Suited cards (56 total)

Four suits, ranks **1–14** each:

| Suit | Color | Role |
|------|-------|------|
| Parrot | Green | Standard |
| Treasure Chest | Yellow | Standard |
| Pirate Map | Purple | Standard |
| Jolly Roger | Black | **Trump** — outranks other suits |

### Special cards (base)

| Card | Count | Notes |
|------|-------|-------|
| Escape | 5 | Always loses (see [Card ranks](./04-card-ranks.md)) |
| Pirate | 5 | One per character (Rosie, Bendt, Rascal, Juanita, Harry) |
| Tigress | 1 | Play as Pirate or Escape |
| Skull King | 1 | Beats Pirates |
| Mermaid | 2 | Beats Skull King and suited cards |

**Base deck: 70 cards.**

### Advanced cards (optional)

| Card | Count | Artifact |
|------|-------|----------|
| Loot | 2 | Loot |
| Kraken | 1 | Kraken |
| White Whale | 1 | Whale |

**Full advanced deck: 74 cards.** Enable in GUB setup via [artifacts](../reference/artifacts-matrix.md).

## Dealing

- Round *n* normally deals **n** cards to each player (when using the default `1,2,3,…,10` schema).
- When the deck cannot deal the full count (e.g. **8 players** in rounds 9–10), deal the maximum possible (8 cards).
- One player is dealer; deal rotates each round. First trick leader is the player after the dealer.

## Round schema

The sequence of hand sizes per round is configurable. See [Round presets](./09-round-presets.md).

## Related

- [Bidding](./02-bidding.md)
- [Artifacts matrix](../reference/artifacts-matrix.md)
