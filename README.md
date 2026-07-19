# GUB

**GUB** (Game hub) is a Next.js app for board and card game tooling. The first title is [**Skull King**](https://github.com/alirezaopmc/gub/tree/main/docs/games/skull-king) — live play, tableside scoring, and rules.

## Features

| Mode | Route | Description |
|------|-------|-------------|
| Hub | `/games/skull-king` | Play, Calculator, or Rules |
| Play | `/games/skull-king/play` | 3–8 player live matches (2-letter join codes) |
| Calculator | `/games/skull-king/calculator` | Single-device voyage scoring |
| Docs | `/games/skull-king/docs` | Rules reference (in-app; markdown source in `docs/`) |

## Quick start

```bash
# Manova workspace (preferred for Manova agents)
git clone git@github.com:alirezaopmc/gub.git ~/Dev/Manova/clients/manova/gub
cd ~/Dev/Manova/clients/manova/gub
npm install
npm run dev   # http://localhost:11003
```

Open [http://localhost:11003](http://localhost:11003). Public product docs: [gub.dfjk.ir](https://gub.dfjk.ir).

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/README.md](./docs/README.md) | Documentation hub |
| [docs/games/skull-king/](./docs/games/skull-king/) | Skull King rules and guides |
| [docs/contributing/](./docs/contributing/) | Development and adding games |
| [docs/design-system.md](./docs/design-system.md) | UI tokens and conventions |

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, Radix UI (shadcn-style)
- Zustand, Vitest

## Scripts

```bash
npm run dev        # development
npm run build      # production build
npm run test:run   # unit tests
npm run lint       # ESLint
```

## Contributing

See [docs/contributing/README.md](./docs/contributing/README.md). Work is tracked in [GitHub Issues](https://github.com/alirezaopmc/gub/issues) under milestones M1–M5.

## License

Private project (`"private": true` in package.json). Contact the repository owner for use terms.
