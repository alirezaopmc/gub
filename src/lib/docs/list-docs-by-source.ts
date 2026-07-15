import fs from "node:fs"
import path from "node:path"

import { loadDoc } from "@/lib/docs/load-doc"

const DOCS_ROOT = path.join(process.cwd(), "docs")

function walkMarkdownFiles(dir: string, prefix = ""): string[] {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const paths: string[] = []

  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      paths.push(...walkMarkdownFiles(fullPath, relative))
      continue
    }

    if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
      paths.push(relative)
    }
  }

  return paths
}

/** All markdown paths under docs/ (e.g. games/skull-king/rules/06-scoring.md). */
export function listAllDocPaths(): string[] {
  return walkMarkdownFiles(DOCS_ROOT)
}

/** Docs whose frontmatter `source` matches the given repo-relative path. */
export function listDocsBySource(sourcePath: string): string[] {
  return listAllDocPaths().filter((relativePath) => {
    const { frontmatter } = loadDoc(relativePath)
    return frontmatter.source === sourcePath
  })
}

export function sourceFileExists(sourcePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), sourcePath))
}
