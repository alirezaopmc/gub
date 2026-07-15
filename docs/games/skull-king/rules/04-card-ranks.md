---
title: Card ranks
description: Which card wins a Skull King trick — suited cards, trump, and specials.
audience: player
game: skull-king
section: rules
order: 4
source: src/lib/games/skull-king/engine/trick-resolution.ts
---

# Card ranks

## Suited cards

- Highest card of the **lead suit** wins.
- **Black (Jolly Roger)** trumps other suits when not the lead suit.
- Among black cards, **highest rank** wins.
- Off-suit standard cards (when you could not follow) do not win unless no competing card beats them.

## Special hierarchy

When specials compete (no Whale effect):

| Winner over… | Card |
|--------------|------|
| Suited cards | Pirate |
| Pirate | Skull King |
| Skull King | Mermaid |
| Mermaid | Pirate |

**Ties among same special:** first played wins (e.g. two Pirates → first Pirate played wins).

## Escape

- Escape **always loses** to any other card.
- If **all** cards played are Escape (or Tigress-as-Escape), **first Escape played** wins.

## Tigress

When played, declare **Pirate** or **Escape**:

- As **Pirate** — follows Pirate rules.
- As **Escape** — follows Escape rules.

## Triple character trick

If **Pirate + Skull King + Mermaid** appear in the same trick:

- **Mermaid wins** the trick.
- Only the **Mermaid captures Skull King** bonus applies (not Pirate→King).

## Capture bonuses

When you win a trick containing certain characters (and make your bid), you earn bonuses. See [Scoring](./06-scoring.md).

## Related

- [Trick resolution](../reference/trick-resolution.md) — full decision tree
- [Leading specials](./05-leading-specials.md)
- [Advanced cards](./07-advanced-cards.md) — Kraken and Whale change resolution
