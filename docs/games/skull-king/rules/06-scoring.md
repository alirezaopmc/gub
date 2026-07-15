---
title: Scoring
description: Skull King round scoring — bids, zero bids, and bonuses.
audience: player
game: skull-king
section: rules
order: 6
source: src/lib/games/skull-king/round-score/score-rules.ts
---

# Scoring

Scoring has two parts: **main** (bid vs tricks won) and **bonus** (only if you made your bid).

## Part 1 — Bid vs tricks won

### Bid of 1 or more

| Result | Points |
|--------|--------|
| Exact (bid = tricks won) | **+20 × bid** |
| Miss | **−10 × \|bid − won\|** |

Missed bids earn **no** points for tricks won.

**Example:** Bid 3, win 3 → **+60**. Bid 2, win 4 → off by 2 → **−20**.

### Bid of 0

Let *n* = hand size (cards dealt).

| Result | Points |
|--------|--------|
| Win 0 tricks | **+10 × n** |
| Win ≥1 trick | **−10 × n** |

**Example:** Round 7, bid 0, win 0 → **+70**. Round 9, bid 0, win 2 → **−90**.

## Part 2 — Bonuses (correct bid only)

If you **miss** your bid, **all bonuses are forfeited** for that round.

### Fourteen bonus

Collecting a **14** in a trick you win:

| Suit | Points |
|------|--------|
| Green, yellow, purple | +10 each |
| Black (Jolly Roger) | +20 |

Requires **FourteenBonus** artifact in GUB.

### Character captures

| Capture | Points |
|---------|--------|
| Pirate takes Mermaid | +20 per mermaid |
| Skull King takes Pirate | +30 per pirate |
| Mermaid takes Skull King | +40 |

Requires **CharacterCapture** artifact. Counts clamp to deck limits.

### Loot alliance

When Loot creates an alliance between the Loot player and trick winner: **+20 each** if **both** players made their bids that round.

Requires **Loot** artifact.

### Rascal wager

Rascal ability: side bet of **10 or 20** points.

- Made bid → **+wager**
- Missed bid → **−wager**

Requires **PirateAbilities** artifact.

## Round total

**Round score = main + bonus**

Voyage total is the sum of all round scores.

## Related

- [Scoring quick reference](../reference/scoring-quick-ref.md) — worked examples
- [Pirate abilities](./08-pirate-abilities.md)
- [FAQ](./10-faq.md)
