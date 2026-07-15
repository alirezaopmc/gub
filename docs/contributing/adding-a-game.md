---
title: Adding a game
description: How to add a second title to GUB — routes, components, lib, and docs.
audience: contributor
section: contributing
order: 1
---

# Adding a game

Skull King is the reference implementation. Follow the same slices when adding game `<slug>`.

## 1. Register on the hub

Add a tile in `src/app/page.tsx` (`games` array) with title, href, and cover image under `public/games/<slug>/`.

## 2. Routes

```
src/app/games/<slug>/
├── page.tsx              # Hub
├── docs/page.tsx         # Rules (future: markdown-driven)
├── play/                 # Optional live play
└── calculator/           # Optional scoring tool
```

Use `src/app/games/layout.tsx` for shared game chrome.

## 3. Components

```
src/components/games/<slug>/
├── hub/
├── setup/
├── play/
├── docs/
└── shared/               # Section chrome reused in-flow
```

One subfolder per major route. CSS modules under each flow's `styles/`. See [source-organization.md](../source-organization.md).

## 4. Logic

```
src/lib/games/<slug>/
├── engine/               # Rules, if applicable
├── types.ts
└── ...                   # Stores, validation, scoring
```

**No React imports** in `lib/` — keeps logic testable from Vitest and API routes.

## 5. API (optional)

```
src/app/api/games/<slug>/...
```

Follow Skull King match routes if you need multiplayer state.

## 6. Documentation

```
docs/games/<slug>/
├── index.md
├── rules/
├── app/
└── reference/
```

Copy scaffolds from [docs/shared/templates/](../shared/templates/). Register pages in the game `index.md`.

Future in-app docs: shared shell in `src/components/docs/` (M4).

## 7. Design

Use semantic tokens from [design-system.md](../design-system.md). Game-specific accents can extend `theme-base.css` (see Skull King suit colors).

## Checklist

- [ ] Hub tile + cover asset
- [ ] `components/games/<slug>/` slices
- [ ] `lib/games/<slug>/` with tests
- [ ] `docs/games/<slug>/` markdown
- [ ] Vitest + lint pass

## Related

- [Skull King index](../games/skull-king/index.md)
- [Local development](./local-dev.md)
