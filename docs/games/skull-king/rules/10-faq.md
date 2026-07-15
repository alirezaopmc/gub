---
title: FAQ
description: Skull King edge cases — triple tricks, Kraken/Whale, Loot, and pirate abilities.
audience: player
game: skull-king
section: rules
order: 10
source: src/lib/games/skull-king/engine/*.test.ts
---

# FAQ

Answers aligned with GUB engine tests and BGA FAQ.

## Trick resolution

### Pirate, Skull King, and Mermaid in one trick — who wins?

**Mermaid wins.** Only the Mermaid→Skull King capture bonus applies; Pirate→King does not.

### Two Pirates in one trick — who wins?

The **first Pirate played** wins.

### Two Mermaids in one trick?

The **first Mermaid played** wins.

### All Escape cards played?

The **first Escape played** wins.

### Black trump vs high standard suit?

**Black wins** even at low rank (e.g. black 2 beats yellow 12 when yellow led).

### Multiple black cards?

**Highest black rank** wins.

## Advanced cards

### Kraken destroys the trick — who leads next?

The player who **would have won** the trick leads the next one.

### White Whale with only specials played?

Trick is **discarded**; **Whale player** leads next.

### Kraken then Whale in the same trick?

**Whale effect** applies (highest suited number wins).

### Whale then Kraken?

**Kraken effect** applies (trick destroyed).

### Loot leads and everyone plays Escape?

**Loot player wins** the trick.

## Scoring

### I made my bid but lost the trick with a 14 — do I get the fourteen bonus?

**No.** Bonuses require winning the trick containing the 14 (or capture), and making your bid.

### I missed my bid but won capture bonuses — do they count?

**No.** All Part 2 bonuses are forfeited on a missed bid.

### Loot alliance — when do we get +20?

When **both** linked players made their bids that round (+20 each).

## Pirate abilities

### Can I use Rosie on the last trick?

**No.** Rosie, Bendt, Rascal, and Juanita are blocked on the final trick. Harry is allowed.

### Capturing an opponent's Pirate — does the ability trigger?

**No.** You must **win the trick with your own Pirate** card.

### Are abilities on when artifacts are disabled?

**No.** Pirate Abilities artifact must be enabled.

## GUB app

### Play match disappeared after a few hours?

Matches are **in-memory** on the server (4h TTL) until persistent storage ships.

### Tie at end of voyage?

**Shared victory** — no extra round.

### Play vs Calculator?

See [Hub guide](../app/hub.md).

## Related

- [Trick resolution](../reference/trick-resolution.md)
- [Scoring](./06-scoring.md)
