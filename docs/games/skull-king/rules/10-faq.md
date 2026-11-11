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

The **first card played** (among Escape, Tigress-as-Escape, or Loot) wins (S1 p.12).

### Escape lead followed by a Pirate or other character — what is the lead suit?

**No suit is established.** Under official rules (S1 p.12), the next player sets suit "unless they play one of these" (Escape or Loot). Playing a character does not choose a suit, so the trick proceeds without a lead suit. In GUB, this is configurable via the `escapeLeadDefersThroughCharacters` flag.

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

### Two Loot cards played in one trick?

Each Loot card forms an **independent alliance** with the trick winner (S1 p.25). If the trick winner played one of the Loots, that Loot forms no alliance (you cannot ally with yourself).

### Does a mid-trick Kraken or Whale let later players ignore follow-suit?

**No.** Leading a creature has no suit, but playing a creature *mid-trick* does not lift the follow-suit obligation for players after it. Players holding the led suit must still follow suit (S1 p.23–24).

### If a trick with a 14 card is destroyed by the Kraken, does anyone get the bonus?

**No.** Kraken trick cards are set aside and destroyed; no player collects cards or bonuses from destroyed tricks (S1 p.23).

## Scoring

### What happens to the Rascal wager if I miss my bid?

You **lose the wagered points** (**−10 or −20 points**; S1 p.26, S2). Standard Part 2 bonuses are forfeited, but the Rascal wager is a penalty on missed bids.

### How does Rascal's Scoring work?

Under **Rascal's Scoring** (S1 pp.18–20), each round has a potential pool of 10 × cards dealt. An exact bid (**Direct Hit**) earns 100% of points and bonuses; off by 1 (**Glancing Blow**) earns 50%; off by 2 or more (**Complete Miss**) earns 0 points. Choosing **Cannonball** yields 15 × cards dealt on a Direct Hit, but 0 points if off by even 1 trick (all-or-nothing).

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
