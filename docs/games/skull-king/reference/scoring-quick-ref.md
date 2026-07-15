---
title: Scoring quick reference
description: Skull King points at a glance with worked examples.
audience: player
game: skull-king
section: reference
order: 1
source: src/lib/games/skull-king/round-score/score-rules.ts
---

# Scoring quick reference

## Part 1 — Main score

| Bid | Tricks won | Formula | Example |
|-----|------------|---------|---------|
| ≥1 | Exact | +20 × bid | Bid 3, win 3 → **+60** |
| ≥1 | Miss | −10 × \|bid − won\| | Bid 2, win 4 → **−20** |
| 0 | 0 | +10 × hand size | Round 7, n=7 → **+70** |
| 0 | ≥1 | −10 × hand size | Round 9, n=9, win 2 → **−90** |

## Part 2 — Bonuses (only if bid exact)

| Bonus | Points | Artifact |
|-------|--------|----------|
| 14 (standard suit) | +10 | FourteenBonus |
| 14 (black) | +20 | FourteenBonus |
| Pirate captures Mermaid | +20 each | CharacterCapture |
| Skull King captures Pirate | +30 each | CharacterCapture |
| Mermaid captures Skull King | +40 | CharacterCapture |
| Loot alliance (each ally) | +20 | Loot |
| Rascal wager (made bid) | +wager | PirateAbilities |
| Rascal wager (missed) | forfeited | PirateAbilities |

## Worked examples

### Example A — Exact bid

- Hand size: 5  
- Bid: 4, Won: 4  
- **Main: +80** (20 × 4)  
- Bonuses: none  
- **Round total: +80**

### Example B — Missed bid

- Hand size: 6  
- Bid: 3, Won: 5  
- Off by 2 → **Main: −20**  
- Bonuses: **forfeited** (even if you captured a 14)  
- **Round total: −20**

### Example C — Zero bid success

- Hand size: 8  
- Bid: 0, Won: 0  
- **Main: +80** (10 × 8)

### Example D — Zero bid fail

- Hand size: 10  
- Bid: 0, Won: 1  
- **Main: −100** (10 × 10)

### Example E — Exact bid + bonuses

- Bid: 2, Won: 2 → **Main: +40**  
- Won trick with black 14 → **+20**  
- Mermaid took Skull King → **+40**  
- **Round total: +100**

### Example F — Rascal wager

- Bid: 3, Won: 3, wager 20 → **Main: +60**, Rascal **+20** → **+80**  
- Bid: 3, Won: 4, wager 20 → **Main: −10**, bonuses **forfeited** → **−10**

## Voyage total

Sum round totals. Highest wins; ties = shared victory.

## Related

- [Scoring rules](../rules/06-scoring.md)
- [Artifacts matrix](./artifacts-matrix.md)
