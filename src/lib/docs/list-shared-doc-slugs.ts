import fs from "node:fs"
import path from "node:path"

const DOCS_ROOT = path.join(process.cwd(), "docs")

/** Top-level shared doc slugs (excludes templates/). */
export function listSharedDocSlugs(): string[] {
  const sharedDir = path.join(DOCS_ROOT, "shared")
  if (!fs.existsSync(sharedDir)) return []

  return fs
    .readdirSync(sharedDir)
    .filter((name) => name.endsWith(".md") || name.endsWith(".mdx"))
    .map((name) => path.basename(name, path.extname(name)))
}
