export type GlossaryTerm = {
  term: string
  definition: string
}

const TERM_ROW_RE = /^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|$/

/** Parse term/definition rows from docs/shared/glossary.md tables. */
export function parseGlossary(markdown: string): GlossaryTerm[] {
  const terms: GlossaryTerm[] = []

  for (const line of markdown.split("\n")) {
    const match = line.match(TERM_ROW_RE)
    if (!match) continue

    const term = match[1].trim()
    const definition = match[2]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim()

    if (term && definition) {
      terms.push({ term, definition })
    }
  }

  return terms
}
