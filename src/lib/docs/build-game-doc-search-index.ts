import fs from "node:fs"
import path from "node:path"

import { listGameDocPaths } from "@/lib/docs/build-game-doc-nav"
import { extractHeadings } from "@/lib/docs/extract-headings"
import { loadDoc } from "@/lib/docs/load-doc"
import { parseGlossary } from "@/lib/docs/parse-glossary"
import { docsRelativePathToRoute } from "@/lib/docs/resolve-doc-href"
import type { DocSearchEntry } from "@/lib/docs/types"

const DOCS_ROOT = path.join(process.cwd(), "docs")
const GLOSSARY_PATH = path.join(DOCS_ROOT, "shared", "glossary.md")

function overviewHref(gameId: string): string {
  return `/games/${gameId}/docs/rules/00-overview`
}

function findGlossaryHref(
  term: string,
  pageMeta: Array<{ title: string; href: string; headings: Array<{ id: string; text: string }> }>,
  fallback: string,
): string {
  const needle = term.toLowerCase()

  for (const page of pageMeta) {
    if (page.title.toLowerCase().includes(needle)) return page.href
    const heading = page.headings.find((h) => h.text.toLowerCase().includes(needle))
    if (heading) return `${page.href}#${heading.id}`
  }

  return fallback
}

/** Build Cmd+K search index for a game's docs. */
export function buildGameDocSearchIndex(gameId: string): DocSearchEntry[] {
  const entries: DocSearchEntry[] = []
  const pageMeta: Array<{ title: string; href: string; headings: Array<{ id: string; text: string }> }> = []

  for (const relativePath of listGameDocPaths(gameId)) {
    const { frontmatter, content } = loadDoc(relativePath)
    const href = docsRelativePathToRoute(relativePath)
    if (!href) continue

    const headings = extractHeadings(content)
    pageMeta.push({
      title: frontmatter.title,
      href,
      headings: headings.map((h) => ({ id: h.id, text: h.text })),
    })

    entries.push({
      id: `page:${relativePath}`,
      kind: "page",
      title: frontmatter.title,
      subtitle: frontmatter.description,
      href,
      keywords: [frontmatter.section ?? "", frontmatter.title, frontmatter.description].filter(
        Boolean,
      ),
    })

    for (const heading of headings) {
      entries.push({
        id: `heading:${relativePath}:${heading.id}`,
        kind: "heading",
        title: heading.text,
        subtitle: frontmatter.title,
        href: `${href}#${heading.id}`,
        keywords: [heading.text, frontmatter.title],
      })
    }
  }

  if (fs.existsSync(GLOSSARY_PATH)) {
    const glossaryMarkdown = fs.readFileSync(GLOSSARY_PATH, "utf8")
    const fallback = overviewHref(gameId)

    for (const { term, definition } of parseGlossary(glossaryMarkdown)) {
      entries.push({
        id: `glossary:${term.toLowerCase().replace(/\s+/g, "-")}`,
        kind: "glossary",
        title: term,
        subtitle: definition.length > 120 ? `${definition.slice(0, 117)}…` : definition,
        href: findGlossaryHref(term, pageMeta, fallback),
        keywords: [term, definition],
      })
    }
  }

  return entries
}
