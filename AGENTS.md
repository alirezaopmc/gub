---
see_also:
  - handbook/docs/clients/manova/overview.md
  - handbook/docs/clients/manova/ports.md
  - handbook/docs/clients/manova/products/gub/overview.md
---

# gub (Game Hub)

Board and card game tooling hub. First title: **Skull King** (live play, tableside scoring, in-app rules). Public app/docs at **https://gub.manova.space**.

Manova workspace home: `clients/manova/gub`. Platform integration (Orbit auth, gateway, `@manovaspace/ui`) is **deferred** — long-term Manova client product, independent stack for now.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commands

```bash
npm install
npm run dev       # http://localhost:10052
npm run build
npm run start
npm run lint
npm run test:run
```

Dev server runs on **port 10052** (see Manova [ports](../../../handbook/docs/clients/manova/ports.md)).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, Radix UI (shadcn-style)
- Zustand, Vitest, MDX docs pipeline
- **No** Orbit / `@manovaspace/*` deps yet

## Docs

| Topic | Where |
| --- | --- |
| Public product docs | https://gub.manova.space (source: `docs/` in this repo) |
| Staff / ops (private) | `handbook/docs/clients/manova/products/gub/` |
| Ports | `handbook/docs/clients/manova/ports.md` |
| Docs hub (in-repo) | `docs/README.md` |

## Structure

| Path | Role |
| --- | --- |
| `src/` | Next.js app |
| `docs/` | Public markdown/MDX (games, contributing, design) |
| `public/games/` | Static game assets |

## Do / don't

- Keep **public** docs in this repo / `gub.dfjk.ir` — never move them into private `handbook`
- Staff facts (ports, platform plans) → `handbook` only
- Do not add Orbit auth/gateway/`@manovaspace/ui` until an explicit platform-integration slice
- No product facts in Orbit architecture pages
- No commit unless the user asks

<!-- manova:conventions v1 — generated from manovaspace/ci conventions/core.md; edit it there -->
## Shared conventions

These rules apply to every Manova repository. They are copied from `manovaspace/ci` (`conventions/core.md`); change them there, not here.

### Delivery

1. Never push to `main`. Every change goes on a topic branch (`feat/<name>`, `fix/<name>`, `refactor/<name>`, `docs/<name>`, `chore/<name>`) and reaches `main` through a pull request.
2. One pull request does one thing. An unrelated problem you find on the way becomes an issue, not part of this change.
3. Pull request titles and commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`; `!` for a breaking change). Releases are computed from them.
4. Merge with squash once the checks are green. Do not use `--no-verify`; if you ever must, say so in the pull request.

### Checks

5. CI runs `manovaspace/ci@v1`. Run the same gate locally before you push; a red check is fixed, not skipped.
6. Tool versions (Go, Node, Bun, linters) come from `ci/versions.env` in `manovaspace/ci`. Do not pin a different version in this repository.
7. A behaviour change comes with a test that fails without it. Do not delete or weaken a test to make a change pass.

### Secrets

8. Never commit a secret, token, password, private key or `.env` file. Commit `.env.example` with placeholders instead.
9. Never print a secret in logs, test output, error messages or pull requests. Read secrets from the environment or a file at run time.

### Runtime

10. Containers talk to each other by name on a Docker network. Do not publish a port on the host unless a person or a host process needs it, and then bind `127.0.0.1`, never `0.0.0.0`.
11. Configuration comes from the environment. A service with a missing required setting refuses to start; it never falls back to a built-in secret or a development default in production.
12. Port numbers come from the workspace port registry. Do not invent a port.

### Documentation

13. This repository explains itself: `README.md` says how to set up, run, test and deploy it; `AGENTS.md` holds its binding rules; repository decisions live in `docs/decisions/`.
14. Write plain, short sentences. Keep exact names, paths, commands and versions. Do not document what the code already says.
<!-- /manova:conventions -->
