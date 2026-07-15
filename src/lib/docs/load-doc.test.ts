import { describe, expect, it } from "vitest"

import { DocNotFoundError, DocPathError } from "@/lib/docs/errors"
import { loadDoc } from "@/lib/docs/load-doc"

describe("loadDoc", () => {
  it("parses frontmatter from fixture", () => {
    const doc = loadDoc("__fixtures__/sample.md")

    expect(doc.frontmatter.title).toBe("Sample doc")
    expect(doc.frontmatter.description).toBe("Fixture for docs pipeline tests.")
    expect(doc.frontmatter.audience).toBe("player")
    expect(doc.content).toContain("# Sample heading")
    expect(doc.content).not.toContain("title: Sample doc")
  })

  it("loads real docs tree", () => {
    const doc = loadDoc("games/skull-king/rules/06-scoring.md")

    expect(doc.frontmatter.title).toBe("Scoring")
    expect(doc.content).toContain("# Scoring")
  })

  it("rejects path traversal", () => {
    expect(() => loadDoc("../package.json")).toThrow(DocPathError)
    expect(() => loadDoc("games/../../package.json")).toThrow(DocPathError)
  })

  it("throws for missing files", () => {
    expect(() => loadDoc("games/skull-king/rules/no-such-page.md")).toThrow(DocNotFoundError)
  })
})
