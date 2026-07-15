# GUB documentation

Markdown-first documentation for [GUB](https://github.com/alirezaopmc/gub) — a game hub starting with **Skull King**.

## Start here

| I want to… | Go to |
|------------|-------|
| Learn Skull King rules | [games/skull-king/index.md](./games/skull-king/index.md) |
| Use Play or Calculator | [games/skull-king/app/](./games/skull-king/app/) |
| Contribute code | [contributing/README.md](./contributing/README.md) |
| Understand doc conventions | [documentation-system.md](./documentation-system.md) |
| See design tokens | [design-system.md](./design-system.md) |

## Structure

```
docs/
├── documentation-system.md    # Layout, IA, future in-app shell spec
├── design-system.md           # Brand palette, typography, UI rules
├── source-organization.md     # Code layout conventions
├── research/                  # Competitive analysis + reference screenshots
├── shared/                    # Templates, glossary
├── games/skull-king/          # Rules, app guides, reference pages
└── contributing/              # Local dev, adding a game
```

## Audiences

- **Players** — trick-taking rules, scoring, edge cases (`audience: player`)
- **App users** — Play, Calculator, hub flows (`audience: user`)
- **Contributors** — setup, architecture, new games (`audience: contributor`)

## Roadmap

Work is tracked in GitHub milestones M1–M4 ([issues](https://github.com/alirezaopmc/gub/issues)). This repo phase is **markdown only**; rendering inside the Next.js app is milestone M4.

## Legacy

The old planning stub [`skull_king.md`](./skull_king.md) is deprecated — use [`games/skull-king/`](./games/skull-king/) instead.
