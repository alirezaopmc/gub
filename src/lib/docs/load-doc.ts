import fs from "node:fs"
import path from "node:path"

import matter from "gray-matter"

import { DocNotFoundError, DocPathError } from "@/lib/docs/errors"
import type { DocFrontmatter, LoadedDoc } from "@/lib/docs/types"

const DOCS_ROOT = path.join(process.cwd(), "docs")

function assertSafeRelativePath(relativePath: string): string {
  if (path.isAbsolute(relativePath) || relativePath.includes("..")) {
    throw new DocPathError()
  }

  const normalized = path.normalize(relativePath)
  const resolved = path.join(DOCS_ROOT, normalized)
  if (!resolved.startsWith(DOCS_ROOT)) {
    throw new DocPathError()
  }

  return normalized
}

export function loadDoc(relativePath: string): LoadedDoc {
  const normalized = assertSafeRelativePath(relativePath)
  const filePath = path.join(DOCS_ROOT, normalized)

  if (!fs.existsSync(filePath)) {
    throw new DocNotFoundError(normalized)
  }

  const raw = fs.readFileSync(filePath, "utf8")
  const { content, data } = matter(raw)

  return {
    frontmatter: data as DocFrontmatter,
    content,
    filePath,
    relativePath: normalized,
  }
}
