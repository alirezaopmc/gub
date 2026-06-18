# Design system

Dark-first application shell: **charcoal background**, **gold primary**, **teal secondary**, **cream type**, rounded UI. Product and feature code should use **semantic tokens**, not raw hex values.

## Brand palette (reference)

| Role | Hex | Tailwind (semantic) |
|------|-----|---------------------|
| Neutral / background | `#121619` | `bg-background` |
| Primary (gold) | `#D4AF37` | `bg-primary`, `text-primary` |
| Secondary (teal) | `#0E3B43` | `bg-secondary`, `text-secondary` |
| Tertiary / body text (cream) | `#F4EBD0` | `text-foreground` |
| Elevated surfaces (panels, modals) | `#1A1A1A` | `bg-card` |
| Muted surfaces | `#262626` | `bg-muted` |

## Typography

Loaded in [`src/app/layout.tsx`](../src/app/layout.tsx) as CSS variables:

| Role | Font | Utility |
|------|------|---------|
| Headline | Epilogue | `font-headline` |
| Body (default) | Manrope | `font-sans` (default on `<body>`) |
| Label / UI chrome | Space Grotesk | `font-label` |

## Where things live

| Layer | Path | Purpose |
|--------|------|---------|
| Tokens + `@theme` | [`src/styles/theme-base.css`](../src/styles/theme-base.css) | Colors, radius (`--radius: 1rem`), fonts. |
| App entry | [`src/app/globals.css`](../src/app/globals.css) | Imports Tailwind + theme; minimal `body` rules. |
| Primitives | [`src/components/ui/`](../src/components/ui/) | shadcn-style building blocks (e.g. `Button` uses `rounded-xl`, variants: `default`, `outline`, `secondary`, `inverted`, `ghost`, `destructive`, `link`). |
| Feature layout | [source-organization.md](./source-organization.md) | Where game flows, slice folders, `styles/`, and `src/lib/games/` fit relative to this doc. |

`html` uses **`class="dark"`** so existing `dark:` utilities stay aligned with the base skin.

Optional **`.light`** on `<html>` swaps to a cream-forward light theme (same gold primary).

## Tailwind vs CSS Modules

- **Tailwind utilities** for layout, spacing, typography one-offs, and simple responsive tweaks.
- **`*.module.css` under each flow’s `styles/` folder** when you need pseudo-selectors (`:hover` / `:focus-visible`), keyframe animations, descendant or attribute selectors, or patterns that become noisy as long Tailwind chains.

Feature-level modules should live next to the slice’s layout (see [source-organization.md](./source-organization.md)); shared primitives belong in `src/components/ui/`.

## Rules

1. **No raw colors** in `src/app/**` or `src/components/**` except rare cases agreed in PR.
2. Use **semantic utilities**: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `text-primary`, etc.
3. Add shadcn pieces with `npx shadcn@latest add <name>`; avoid forking primitives per feature—extend with `className`, variants, or thin wrappers.

## `cn()` usage

```tsx
import { cn } from "@/lib/utils"

<div className={cn("base-classes", condition && "conditional", className)} />
```
