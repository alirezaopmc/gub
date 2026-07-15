import { describe, expect, it } from "vitest"

import { extractHeadings } from "@/lib/docs/extract-headings"
import { loadDoc } from "@/lib/docs/load-doc"

describe("extractHeadings", () => {
  it("extracts h2 and h3 with slug ids", () => {
    const headings = extractHeadings(`# Title\n\n## Foo Bar\n\n### Baz Qux\n`)

    expect(headings).toEqual([
      { id: "foo-bar", text: "Foo Bar", level: 2 },
      { id: "baz-qux", text: "Baz Qux", level: 3 },
    ])
  })

  it("dedupes duplicate heading text like rehype-slug", () => {
    const headings = extractHeadings(`## Setup\n\n## Setup\n`)

    expect(headings[0].id).toBe("setup")
    expect(headings[1].id).toBe("setup-1")
  })

  it("matches real scoring doc structure", () => {
    const { content } = loadDoc("games/skull-king/rules/06-scoring.md")
    const headings = extractHeadings(content)

    expect(headings.length).toBeGreaterThan(0)
    expect(headings.every((h) => h.level === 2 || h.level === 3)).toBe(true)
    expect(headings[0].id).toBeTruthy()
  })
})
