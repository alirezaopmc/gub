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

## Development servers

### Frontend (Next.js)

```bash
npm run dev
```

Open [http://localhost:11003](http://localhost:11003) (Manova ADR-006 port for GUB).

### Backend (Go Game Server)

The authoritative game server runs on port 8080:

```bash
cd server
go run ./cmd/server
```

Run tests across all engine packages and games:

```bash
cd server
go test -race ./...
```

#### Database (optional)

Without a database the server keeps rooms and events in memory. Set `DATABASE_URL` to use Postgres:

```bash
DATABASE_URL="postgres://user:password@localhost:5432/gub?sslmode=disable" go run ./cmd/server
```

- **Migrations run on startup.** The server applies every `server/migrations/*.sql` file that is not yet recorded in `schema_migrations`, in name order, each in its own transaction. Several nodes can start at once. An advisory lock makes them apply each file once. If a migration fails, the server exits.
- **Add a migration** as a new file with the next number, for example `003_<name>.sql`. Do not edit a migration that has already been applied.
- **Database tests** are skipped unless `TEST_DATABASE_URL` is set. Each test creates its own schema and drops it afterwards, so the URL can point at a shared development database:

```bash
TEST_DATABASE_URL="postgres://user:password@localhost:5432/gub_test?sslmode=disable" go test -race -count=1 ./...
```

| Route | Purpose |
|-------|---------|
| `/` | Game hub |
| `/games/skull-king` | Skull King entry |
| `/games/skull-king/play` | Live play lobby |
| `/games/skull-king/viewer` | Table Display TV viewer |
| `/games/skull-king/calculator` | Score calculator |
| `/games/skull-king/docs` | In-app rules and reference |

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
