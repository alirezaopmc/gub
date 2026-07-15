import GithubSlugger from "github-slugger"

import type { DocHeading } from "@/lib/docs/types"

const HEADING_RE = /^(#{2,3})\s+(.+)$/gm

/** Extract h2/h3 headings from markdown body with ids matching rehype-slug. */
export function extractHeadings(markdown: string): DocHeading[] {
  const slugger = new GithubSlugger()
  const headings: DocHeading[] = []

  for (const match of markdown.matchAll(HEADING_RE)) {
    const hashes = match[1]
    const text = match[2].replace(/\s+#+\s*$/, "").trim()
    const level = hashes.length as 2 | 3
    if (level !== 2 && level !== 3) continue

    headings.push({
      id: slugger.slug(text),
      text,
      level,
    })
  }

  return headings
}
