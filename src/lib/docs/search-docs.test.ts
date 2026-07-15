import { describe, expect, it } from "vitest"

import { buildGameDocSearchIndex } from "@/lib/docs/build-game-doc-search-index"
import { searchDocs } from "@/lib/docs/search-docs"

describe("searchDocs", () => {
  const index = buildGameDocSearchIndex("skull-king")

  it("returns empty for blank query", () => {
    expect(searchDocs(index, "")).toEqual([])
    expect(searchDocs(index, "   ")).toEqual([])
  })

  it("ranks scoring page first for 'scoring'", () => {
    const results = searchDocs(index, "scoring")
    expect(results[0]?.title).toBe("Scoring")
    expect(results[0]?.kind).toBe("page")
  })

  it("matches partial bid to bidding", () => {
    const results = searchDocs(index, "bid")
    expect(results.some((r) => r.title === "Bidding")).toBe(true)
  })

  it("respects limit", () => {
    expect(searchDocs(index, "a", 3)).toHaveLength(3)
  })

  it("finds glossary zero bid", () => {
    const results = searchDocs(index, "zero bid")
    expect(results.some((r) => r.kind === "glossary" && r.title === "Zero bid")).toBe(true)
  })
})
