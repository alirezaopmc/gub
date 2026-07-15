---
title: Advanced cards
description: Kraken, White Whale, and Loot — optional expansion cards in Skull King.
audience: player
game: skull-king
section: rules
order: 7
artifacts:
  - Kraken
  - Whale
  - Loot
source: src/lib/games/skull-king/engine/trick-resolution.ts
---

# Advanced cards

Optional cards added when [artifacts](../reference/artifacts-matrix.md) are enabled. All count as **special cards** — playable even when you could follow suit.

## Loot

- When you **take** a Loot card in a trick, you may form a **Loot alliance** with the player who played the Loot.
- **+20 each** at round end if both allies made their bids.
- See [Scoring](./06-scoring.md).

## Kraken

- When Kraken is played, the trick is **destroyed** — no winner.
- The player who **would have won** leads the next trick.
- Kraken mid-trick can change follow-suit obligations for remaining players in edge cases.

## White Whale

- When Whale is played, **special cards cannot win** the trick.
- The **highest numbered suited card** wins, regardless of suit.
- Ties: first played wins.
- If **only specials** were played, the trick is **discarded** and the Whale player leads next.

## Kraken + Whale same trick

Only the effect of the **second** card played applies.

- Kraken then Whale → Whale rules (highest suited wins).
- Whale then Kraken → Kraken rules (trick destroyed).

## Related

- [Trick resolution](../reference/trick-resolution.md)
- [Artifacts matrix](../reference/artifacts-matrix.md)
- [Leading specials](./05-leading-specials.md)
