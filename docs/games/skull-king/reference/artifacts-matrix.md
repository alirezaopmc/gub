---
title: Artifacts matrix
description: Which Skull King rules change when each GUB artifact toggle is enabled.
audience: player
game: skull-king
section: reference
order: 2
source: src/lib/games/skull-king/artifacts.ts
---

# Artifacts matrix

**Artifacts** are expansion and house-rule toggles in GUB setup. Future docs UI will filter pages by enabled artifacts (GamersPaper-style).

## Preset bundles

| Preset | PirateAbilities | CharacterCapture | Whale | Kraken | Loot | FourteenBonus |
|--------|-----------------|------------------|-------|--------|------|---------------|
| **Beginner** | — | — | — | — | — | — |
| **Intermediate** | — | — | ✓ | ✓ | ✓ | — |
| **Expert** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Per-artifact effects

| Artifact | Deck | Gameplay | Scoring |
|----------|------|----------|---------|
| **Whale** | +1 White Whale | Specials cannot win trick; highest suited wins; specials-only → discard | — |
| **Kraken** | +1 Kraken | Trick destroyed; would-be winner leads | — |
| **Loot** | +2 Loot | Loot lead / alliance tracking | +20 each ally if both make bid |
| **PirateAbilities** | — | Rosie, Bendt, Rascal, Juanita, Harry powers on pirate win | Rascal ±wager |
| **CharacterCapture** | — | Capture bonuses tracked | +20 / +30 / +40 captures |
| **FourteenBonus** | — | 14s in won tricks tracked | +10 standard / +20 black |

## Doc pages by artifact

| Page | Required artifacts |
|------|-------------------|
| [Advanced cards](../rules/07-advanced-cards.md) | Whale, Kraken, and/or Loot |
| [Pirate abilities](../rules/08-pirate-abilities.md) | PirateAbilities |
| [Scoring — bonuses](../rules/06-scoring.md) | Per bonus row above |

## Beginner game

With **no artifacts**:

- 70-card base deck only
- No Kraken/Whale/Loot tricks
- No pirate abilities or capture/fourteen bonuses in Calculator events

## Custom toggles

Any combination is valid in Calculator setup. Play mode uses match config from host.

## Related

- [Setup & deck](../rules/01-setup-deck.md)
- [documentation-system.md](../../../documentation-system.md) — future ArtifactFilter UI
