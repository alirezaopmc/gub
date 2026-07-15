import fs from "node:fs"
import path from "node:path"

import { loadDoc } from "@/lib/docs/load-doc"
import { docsRelativePathToRoute } from "@/lib/docs/resolve-doc-href"
import type { DocNavConfig, DocNavGroup, DocNavItem } from "@/lib/docs/types"

const DOCS_ROOT = path.join(process.cwd(), "docs")

const SECTION_LABELS: Record<string, string> = {
  rules: "Rules",
  reference: "Quick reference",
  app: "App guides",
}

const SECTION_ORDER = ["rules", "reference", "app"] as const

/** All markdown paths under docs/games/<gameId>/. */
export function listGameDocPaths(gameId: string): string[] {
  return SECTION_ORDER.flatMap((section) => listMarkdownInSection(gameId, section))
}

const GAME_TITLES: Record<string, string> = {
  "skull-king": "Skull King",
}

function titleFromGameId(gameId: string): string {
  return (
    GAME_TITLES[gameId] ??
    gameId
      .split("-")
      .map((p) => p.slice(0, 1).toLocaleUpperCase() + p.slice(1))
      .join(" ")
  )
}

/** Slugs (filename without extension) for generateStaticParams. */
export function listGameDocSlugs(gameId: string, section: string): string[] {
  return listMarkdownInSection(gameId, section).map((relativePath) =>
    path.basename(relativePath, path.extname(relativePath)),
  )
}

function listMarkdownInSection(gameId: string, section: string): string[] {
  const sectionDir = path.join(DOCS_ROOT, "games", gameId, section)
  if (!fs.existsSync(sectionDir)) return []

  return fs
    .readdirSync(sectionDir)
    .filter((name) => name.endsWith(".md") || name.endsWith(".mdx"))
    .map((name) => `games/${gameId}/${section}/${name}`)
}

function buildGroup(gameId: string, section: string): DocNavGroup | null {
  const paths = listMarkdownInSection(gameId, section)
  if (paths.length === 0) return null

  const items: DocNavItem[] = paths
    .map((relativePath) => {
      const { frontmatter } = loadDoc(relativePath)
      const href = docsRelativePathToRoute(relativePath)
      if (!href) return null
      return {
        title: frontmatter.title,
        href,
        order: frontmatter.order ?? 999,
      }
    })
    .filter((item): item is DocNavItem & { order: number } => item !== null)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map(({ title, href }) => ({ title, href }))

  if (items.length === 0) return null

  return {
    label: SECTION_LABELS[section] ?? section,
    section,
    items,
  }
}

/** Build sidebar nav from docs/games/<gameId>/ frontmatter. */
export function buildGameDocNav(gameId: string): DocNavConfig {
  const groups = SECTION_ORDER.map((section) => buildGroup(gameId, section)).filter(
    (group): group is DocNavGroup => group !== null,
  )

  return {
    gameId,
    gameTitle: titleFromGameId(gameId),
    groups,
  }
}
