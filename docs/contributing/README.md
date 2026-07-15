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

## Pull requests

- Focused diffs; link related issue when applicable
- Run `npm run lint` and `npm run test:run` before opening
- Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`)
- Docs-only PRs: label `docs`

## Agent / AI coding

See root `AGENTS.md` for Next.js 16 conventions used in this repo.
