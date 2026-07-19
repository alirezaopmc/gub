---
title: Local development
description: Run, test, and lint GUB on your machine.
audience: contributor
section: contributing
order: 0
---

# Local development

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** (comes with Node)

## Clone and install

```bash
git clone git@github.com:alirezaopmc/gub.git
cd gub
npm install
```

## Development server

```bash
npm run dev
```

Open [http://localhost:11003](http://localhost:11003) (Manova ADR-006 port for GUB).

| Route | Purpose |
|-------|---------|
| `/` | Game hub |
| `/games/skull-king` | Skull King entry |
| `/games/skull-king/play` | Live play lobby |
| `/games/skull-king/calculator` | Score calculator |
| `/games/skull-king/docs` | In-app rules (JSX until M4) |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest single run |

## Project layout

```
src/
├── app/              # Next.js routes + API
├── components/       # React UI (games/, ui/)
├── lib/games/        # Pure game logic (no React)
└── styles/           # Theme tokens, motion
docs/                 # Markdown documentation (source of truth)
```

See [source-organization.md](../source-organization.md).

## Testing

Skull King engine and scoring have Vitest coverage under `src/lib/games/skull-king/`.

```bash
npm run test:run
```

When changing scoring rules, update both `score-rules.ts` and `docs/games/skull-king/`.

## Documentation

Edit markdown in `docs/`. Conventions: [documentation-system.md](../documentation-system.md).

## Related

- [Adding a game](./adding-a-game.md)
- [Contributing README](./README.md)
