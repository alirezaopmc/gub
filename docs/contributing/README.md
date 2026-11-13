# Contributing to GUB

Thank you for helping improve the game hub.

## Quick links

| Guide | Topic |
|-------|-------|
| [Local development](./local-dev.md) | Clone, install, test, lint |
| [Adding a game](./adding-a-game.md) | Pattern for game #2 |
| [Documentation](../README.md) | Markdown docs and conventions |
| [Design system](../design-system.md) | Colors, typography, UI rules |
| [Source organization](../source-organization.md) | `components/` vs `lib/` layout |

## Ways to contribute

- **Documentation** — edit markdown under `docs/`; follow [documentation-system.md](../documentation-system.md)
- **Skull King rules accuracy** — align with `src/lib/games/skull-king/` engine and `score-rules.ts`
- **Issues** — [github.com/alirezaopmc/gub/issues](https://github.com/alirezaopmc/gub/issues)
- **Code** — match existing patterns in `src/components/games/skull-king/` and `src/lib/games/skull-king/`

## Card art

Skull King card images are **original SVG artwork** drawn by code, not photographs or third-party art.

- **Where:** `public/games/skull-king/cards/*.svg`. File names come from `cardImagePath` and `CARD_BACK_IMAGE` in `src/lib/games/skull-king/engine/cards.ts`.
- **Source:** `scripts/generate-card-art.ts` draws every card from basic shapes. Colours come from `src/lib/games/skull-king/engine/card-palette.ts`.
- **Regenerate:** `bun run generate:card-art`. The output is deterministic, so re-running it on an unchanged script leaves the files unchanged. Commit the regenerated SVGs with the script change.
- **Do not add third-party card art** (publisher, Board Game Arena or other copied artwork). Change the generator instead.
- **Tests:** `src/lib/games/skull-king/engine/card-art.test.ts` checks that every card path has a generated file.

## Pull requests

- Focused diffs; link related issue when applicable
- Run `npm run lint` and `npm run test:run` before opening
- Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`)
- Docs-only PRs: label `docs`

## Agent / AI coding

See root `AGENTS.md` for Next.js 16 conventions used in this repo.
