import fs from "node:fs"
import path from "node:path"

const DOCS_ROOT = path.join(process.cwd(), "docs")
const SKULL_KING_GAME_ID = "skull-king"

export type SkullKingDocSection = "rules" | "reference" | "app"

function resolveDocExtension(sectionPath: string): ".md" | ".mdx" {
  const mdxPath = path.join(DOCS_ROOT, `${sectionPath}.mdx`)
  if (fs.existsSync(mdxPath)) return ".mdx"
  return ".md"
}

/** Map a route section + slug to a docs-relative path. */
export function skullKingDocPath(section: SkullKingDocSection, slug: string): string {
  const base = `games/${SKULL_KING_GAME_ID}/${section}/${slug}`
  return `${base}${resolveDocExtension(base)}`
}
