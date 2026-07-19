# gub (Game Hub)

Board and card game tooling hub. First title: **Skull King** (live play, tableside scoring, in-app rules). Public app/docs at **https://gub.manova.space**.

Manova workspace home: `clients/manova/gub`. Platform integration (Orbit auth, gateway, `@manovaspace/ui`) is **deferred** — long-term Manova client product, independent stack for now.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

```bash
npm install
npm run dev       # http://localhost:11003
npm run build
npm run start
npm run lint
npm run test:run
```

Dev server runs on **port 11003** (see Manova [ports](../../../orbit/orbit-docs/content/docs/clients/manova/ports.mdx)).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, Radix UI (shadcn-style)
- Zustand, Vitest, MDX docs pipeline
- **No** Orbit / `@manovaspace/*` deps yet

## Docs

| Topic | Where |
| --- | --- |
| Public product docs | https://gub.manova.space (source: `docs/` in this repo) |
| Staff / ops (private) | `orbit/orbit-docs/content/docs/clients/manova/products/gub/` |
| Ports | `orbit/orbit-docs/content/docs/clients/manova/ports.mdx` |
| Docs hub (in-repo) | `docs/README.md` |

## Structure

| Path | Role |
| --- | --- |
| `src/` | Next.js app |
| `docs/` | Public markdown/MDX (games, contributing, design) |
| `public/games/` | Static game assets |

## Do / don't

- Keep **public** docs in this repo / `gub.dfjk.ir` — never move them into private `orbit-docs`
- Staff facts (ports, Coolify, platform plans) → `orbit-docs` only
- Do not add Orbit auth/gateway/`@manovaspace/ui` until an explicit platform-integration slice
- No product facts in Orbit architecture pages
- No commit unless the user asks
