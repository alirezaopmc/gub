import type { DocSearchEntry } from "@/lib/docs/types"

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** True when all query chars appear in order within text. */
function isSubsequence(query: string, text: string): boolean {
  let qi = 0
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) qi++
  }
  return qi === query.length
}

function scoreEntry(entry: DocSearchEntry, query: string): number {
  const title = normalize(entry.title)
  const subtitle = normalize(entry.subtitle ?? "")
  const keywords = (entry.keywords ?? []).map(normalize).join(" ")

  if (title === query) return 100
  if (title.startsWith(query)) return 90
  if (title.includes(query)) return 80

  if (entry.kind === "heading" && title.includes(query)) return 60
  if (entry.kind === "glossary" && title.includes(query)) return 50
  if (subtitle.includes(query)) return 30
  if (keywords.includes(query)) return 25

  if (isSubsequence(query, title)) return 40
  if (isSubsequence(query, subtitle)) return 20

  return 0
}

/** Rank docs search entries by fuzzy match score. */
export function searchDocs(
  entries: DocSearchEntry[],
  query: string,
  limit = 8,
): DocSearchEntry[] {
  const normalized = normalize(query)
  if (!normalized) return []

  const scored = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, normalized) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))

  return scored.slice(0, limit).map(({ entry }) => entry)
}
