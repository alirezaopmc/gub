import { describe, expect, it } from "vitest"

import { parseGlossary } from "@/lib/docs/parse-glossary"

const SAMPLE = `
| Term | Definition |
|------|------------|
| **Bid** | Number of tricks a player commits to win in a round (0 through hand size). |
| **Zero bid** | Bidding 0 tricks; special scoring (+10× hand size if exact, −10× if miss). |
`

describe("parseGlossary", () => {
  it("parses bold term rows", () => {
    const terms = parseGlossary(SAMPLE)
    expect(terms).toHaveLength(2)
    expect(terms[0]).toEqual({
      term: "Bid",
      definition: "Number of tricks a player commits to win in a round (0 through hand size).",
    })
  })

  it("strips markdown links from definitions", () => {
    const terms = parseGlossary(
      "| **Artifact** | Optional toggle. See [artifacts matrix](../games/skull-king/reference/artifacts-matrix.md). |",
    )
    expect(terms[0].definition).toContain("artifacts matrix")
    expect(terms[0].definition).not.toContain("](")
  })
})
