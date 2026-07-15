import { describe, expect, it } from "vitest"

import { listDocsBySource, sourceFileExists } from "@/lib/docs/list-docs-by-source"
import { SCORE_RULES_SOURCE } from "@/lib/docs/scoring-doc-fixtures"

describe("listDocsBySource", () => {
  it("finds scoring docs linked to score-rules.ts", () => {
    const paths = listDocsBySource(SCORE_RULES_SOURCE)
    expect(paths).toContain("games/skull-king/rules/06-scoring.md")
    expect(paths).toContain("games/skull-king/reference/scoring-quick-ref.md")
    expect(paths).toHaveLength(2)
  })

  it("reports when source file exists on disk", () => {
    expect(sourceFileExists(SCORE_RULES_SOURCE)).toBe(true)
    expect(sourceFileExists("src/lib/games/skull-king/round-score/missing.ts")).toBe(false)
  })
})
