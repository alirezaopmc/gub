---
title: Playing tricks
description: Follow suit, special cards, and turn order in Skull King tricks.
audience: player
game: skull-king
section: rules
order: 3
source: src/lib/games/skull-king/engine/legal-moves.ts
---

# Playing tricks

## Turn order

1. The **leader** plays any legal card from their hand.
2. Play continues **clockwise**.
3. Each player plays one card.
4. The **trick winner** leads the next trick.

## Follow suit

When a **suited card** leads (including black trump):

- If you hold a card of the **led suit**, you **must** play one.
- You **cannot** play black trump if you hold the led **standard** suit (green, yellow, or purple).
- If you do not hold the led suit, you may play any card.

## Special cards

**Special cards** (Escape, Pirates, characters, advanced) are **not** suit cards.

- You may play a special card **even when you could follow suit**.
- Exception: you still cannot play black trump when you hold the led standard suit.

## Winning the trick

See [Card ranks](./04-card-ranks.md) and [Trick resolution](../reference/trick-resolution.md).

## Leading

What happens when a special card **leads** affects follow-suit rules. See [Leading specials](./05-leading-specials.md).

## Related

- [Card ranks](./04-card-ranks.md)
- [Trick resolution](../reference/trick-resolution.md)
