import { describe, expect, it } from "vitest"

import { buildGameDocSearchIndex } from "@/lib/docs/build-game-doc-search-index"

describe("buildGameDocSearchIndex", () => {
  const index = buildGameDocSearchIndex("skull-king")

  it("includes all 17 pages", () => {
    const pages = index.filter((e) => e.kind === "page")
    expect(pages).toHaveLength(17)
  })

  it("includes heading entries with hash anchors", () => {
    const headings = index.filter((e) => e.kind === "heading")
    expect(headings.length).toBeGreaterThan(0)
    expect(headings.every((e) => e.href.includes("#"))).toBe(true)
  })

  it("includes glossary terms", () => {
    const glossary = index.filter((e) => e.kind === "glossary")
    expect(glossary.length).toBeGreaterThan(10)
    expect(glossary.some((e) => e.title === "Zero bid")).toBe(true)
  })

  it("maps scoring page to correct route", () => {
    const scoring = index.find((e) => e.kind === "page" && e.title === "Scoring")
    expect(scoring?.href).toBe("/games/skull-king/docs/rules/06-scoring")
  })
})
