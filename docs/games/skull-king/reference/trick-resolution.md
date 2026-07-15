---
title: Trick resolution
description: Decision tree for who wins a Skull King trick.
audience: player
game: skull-king
section: reference
order: 0
source: src/lib/games/skull-king/engine/trick-resolution.ts
---

# Trick resolution

Use this at the table when multiple card types compete. For prose rules see [Card ranks](../rules/04-card-ranks.md).

## Decision flow

```mermaid
flowchart TD
  Start[Trick complete] --> WhaleCheck{White Whale played?}
  WhaleCheck -->|yes| WhaleRule[Specials cannot win. Highest suited rank wins. Ties: first played. Only specials: discard, Whale player leads.]
  WhaleCheck -->|no| KrakenCheck{Kraken played?}
  KrakenCheck -->|yes| KrakenRule[Trick destroyed. Would-be winner leads next.]
  KrakenCheck -->|no| TripleCheck{Pirate + King + Mermaid?}
  TripleCheck -->|yes| MermaidWins[Mermaid wins. King-by-Mermaid bonus only.]
  TripleCheck -->|no| SpecialCheck{Any specials played?}
  SpecialCheck -->|no| SuitedWin[Highest of lead suit wins. Black trumps non-lead suits.]
  SpecialCheck -->|yes| Hierarchy[Apply special hierarchy]
  Hierarchy --> PirateBeat[Pirate beats suited]
  Hierarchy --> KingBeat[Skull King beats Pirate]
  Hierarchy --> MermaidBeat[Mermaid beats Skull King]
  Hierarchy --> PirateOverMermaid[Pirate beats Mermaid]
  Hierarchy --> EscapeLose[Escape loses unless all Escape: first Escape wins]
  Hierarchy --> Tigress[Tigress: use declared mode]
```

## Special beat order (no Whale)

```
Suited < Pirate < Skull King < Mermaid
         ↑___________________|
              Pirate beats Mermaid
```

Same special type → **first played** wins.

## Suited-only tricks

1. If all cards share the lead suit → highest rank of that suit wins.
2. If black played off-suit → black wins (highest black if multiple).
3. Off-suit non-trump cards do not beat in-suit cards.

## Kraken + Whale interaction

| Order played | Result |
|--------------|--------|
| Kraken first, Whale second | Whale rules |
| Whale first, Kraken second | Kraken rules |

## Loot alliance

When Loot is played and another player wins the suited portion, record **lootPlayerIndex** + **trickWinnerIndex** for scoring. See [Scoring](../rules/06-scoring.md).

## Related

- [Leading specials](../rules/05-leading-specials.md)
- [Advanced cards](../rules/07-advanced-cards.md)
- [FAQ](../rules/10-faq.md)
