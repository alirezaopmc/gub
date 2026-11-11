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

If you **miss** your bid, standard bonuses (14s, captures, alliances) are **forfeited** for that round. The Rascal wager is lost (**−wager**).

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
- Missed bid → **−wager** (lose the wagered points)

Requires **PirateAbilities** artifact.

## Round total

**Round score = main + bonus**

Voyage total is the sum of all round scores.

## Scoring systems

Skull King supports two scoring systems (selectable at match creation in GUB):
- **Classic Scoring (default):** The traditional high-stakes system described above.
- **Rascal's Scoring (rulebook pp. 18–20):** An alternative, beginner-friendly system with no negative points and ammunition choices.

## Rascal's Scoring (Alternative System)

Under **Rascal's Scoring**, each round has a fixed potential pool equal to **10 × cards dealt** (e.g. 50 points in a 5-card round). Players never receive negative round scores.

After bidding, each player selects their ammunition mode: **Grapeshot** or **Cannonball**.

### Grapeshot (Standard Rascal)

Accuracy determines your score tier:

| Outcome | Accuracy | Main Points | Bonuses |
|---------|----------|-------------|---------|
| **Direct Hit** | Exact bid (`bid = won`) | **100%** (10 × cards) | **100%** of earned bonuses |
| **Glancing Blow** | Off by 1 trick (`\|bid − won\| = 1`) | **50%** (5 × cards) | **50%** of earned bonuses |
| **Complete Miss** | Off by ≥2 tricks | **0 points** | **0 points** |

Zero bids follow the exact same tiers: winning 0 tricks is a Direct Hit, winning 1 trick is a Glancing Blow (50%), and winning 2 or more is a Complete Miss (0).

### Cannonball (High-Risk All-or-Nothing)

Players confident in their hand may choose a **Cannonball**:

| Outcome | Accuracy | Main Points | Bonuses |
|---------|----------|-------------|---------|
| **Direct Hit** | Exact bid (`bid = won`) | **15 × cards dealt** | **100%** of earned bonuses |
| **Miss** | Off by ≥1 trick | **0 points** | **0 points** |

There is no Glancing Blow safety net for Cannonball; any miss yields zero points.

### Rulebook worked examples (pp. 18–20)

- **Example A (Round 3, 3 cards dealt — 30 pts potential):**
  - Harry bids 0, wins 0 → Direct Hit → **30 pts**
  - Shirley bids 1, wins 1 → Direct Hit → **30 pts**
  - Poe bids 2, wins 2 → Direct Hit → **30 pts**
- **Example B (Round 4, 4 cards dealt — 40 pts potential):**
  - Harry bids 1, wins 1 → Direct Hit → **40 pts**
  - Shirley bids 0, wins 1 → Glancing Blow → **20 pts**
  - Poe bids 4, wins 2 → Complete Miss → **0 pts**

## Related

- [Scoring quick reference](../reference/scoring-quick-ref.md) — worked examples
- [Pirate abilities](./08-pirate-abilities.md)
- [FAQ](./10-faq.md)
