# Skull King documentation

Trick-taking on the high seas — rules, references, and app guides for GUB.

Based on the Grandpa Beck's rulebook. Aligned with the [BGA Skull King FAQ](https://en.doc.boardgamearena.com/Gamehelpskullking) where noted.

## Rules (learn to play)

| # | Page | Summary |
|---|------|---------|
| 0 | [Overview](./rules/00-overview.md) | Objective and game flow |
| 1 | [Setup & deck](./rules/01-setup-deck.md) | Components and dealing |
| 2 | [Bidding](./rules/02-bidding.md) | How bids work |
| 3 | [Playing tricks](./rules/03-trick-play.md) | Follow suit and turn order |
| 4 | [Card ranks](./rules/04-card-ranks.md) | Who wins a trick |
| 5 | [Leading specials](./rules/05-leading-specials.md) | What happens when specials lead |
| 6 | [Scoring](./rules/06-scoring.md) | Points per round |
| 7 | [Advanced cards](./rules/07-advanced-cards.md) | Kraken, Whale, Loot |
| 8 | [Pirate abilities](./rules/08-pirate-abilities.md) | Expert expansion powers |
| 9 | [Round presets](./rules/09-round-presets.md) | Voyage hand-size sequences |
| 10 | [FAQ](./rules/10-faq.md) | Edge cases |

## Quick reference

| Page | Use when |
|------|----------|
| [Scoring quick reference](./reference/scoring-quick-ref.md) | Calculating points at table end |
| [Trick resolution](./reference/trick-resolution.md) | “Who wins this trick?” |
| [Artifacts matrix](./reference/artifacts-matrix.md) | Which options change the rules |

## App guides

| Mode | Guide | Route |
|------|-------|-------|
| Hub | [When to use what](./app/hub.md) | `/games/skull-king` |
| Play | [Live multiplayer](./app/play.md) | `/games/skull-king/play` |
| Calculator | [Tableside scoring](./app/calculator.md) | `/games/skull-king/calculator` |

## Source of truth (code)

| Topic | File |
|-------|------|
| Scoring | `src/lib/games/skull-king/round-score/score-rules.ts` |
| Artifacts | `src/lib/games/skull-king/artifacts.ts` |
| Round presets | `src/lib/games/skull-king/rounds-schema.ts` |
| Trick resolution | `src/lib/games/skull-king/engine/trick-resolution.ts` |

In-app rules (legacy JSX until M4): `src/components/games/skull-king/docs/skull-king-docs-view.tsx`
