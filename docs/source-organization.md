# Source organization

How feature code is split between `src/components`, `src/lib`, and styles. This complements the visual rules in [design-system.md](./design-system.md).

## Documentation (`docs/`)

Markdown under `docs/` is the **source of truth** for player rules and contributor guides. Conventions (frontmatter, IA, future in-app mapping) live in [documentation-system.md](./documentation-system.md).

| Path | Purpose |
|------|---------|
| `docs/games/<game>/` | Per-game rules, app guides, reference |
| `docs/shared/` | Templates, glossary |
| `docs/contributing/` | Local dev, adding games |
| `docs/research/` | Competitive analysis |

Game code mirrors doc structure: `src/components/games/<game>/`, `src/lib/games/<game>/`, `src/app/games/<game>/`.

## Layers

| Area | Path | Use for |
|------|------|---------|
| Primitives | `src/components/ui/` | Reusable controls (shadcn-style); shared across features. |
| Game UI | `src/components/games/<game>/` | Screens and flows specific to one game. |
| Pure logic | `src/lib/games/<game>/` | Types, constants, and functions with **no React imports**—safe for hooks, server code, and tests. |

## Game flows that grow past a handful of files

Prefer a **subfolder per route or major flow** (for example `src/components/games/skull-king/setup/` for the host setup page).

Within that flow:

1. **Slice folders** — group by domain (`crew/`, `artifacts/`, `navigation/`, …) plus `shared/` for section chrome reused across slices.
2. **`styles/`** — keep **all** CSS modules for the flow under `…/<flow>/styles/*.module.css` so TypeScript files in slice folders are not mixed with stylesheets at the same directory level. Components import modules from `@/components/games/.../setup/styles/...`.
3. **Public entry** — export the route-facing component from `…/<flow>/index.ts` so `src/app` can import `@/components/games/<game>/<flow>` without reaching into slice internals.

## What stays in `src/lib`

- Validation, normalization, scoring helpers, roman numerals, etc.
- Serializable types and initial state factories used by UI **when they do not import React or JSX**.

Catalogs that map ids to **React icon components** belong under `src/components` with the UI slice, not in `lib`, so `lib` stays framework-agnostic.

## Imports

Use the `@/` alias (`tsconfig` paths) for all internal imports. Prefer importing shared setup chrome from `shared/` rather than deep cross-slices unless you intentionally share a primitive.
