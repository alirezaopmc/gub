import { describe, expect, it } from "vitest"

import { docsRelativePathToRoute, resolveDocHref } from "@/lib/docs/resolve-doc-href"

describe("docsRelativePathToRoute", () => {
  it("maps rules paths", () => {
    expect(docsRelativePathToRoute("games/skull-king/rules/06-scoring.md")).toBe(
      "/games/skull-king/docs/rules/06-scoring",
    )
  })

  it("maps app paths", () => {
    expect(docsRelativePathToRoute("games/skull-king/app/play.md")).toBe(
      "/games/skull-king/docs/play",
    )
  })

  it("maps reference paths", () => {
    expect(docsRelativePathToRoute("games/skull-king/reference/scoring-quick-ref.md")).toBe(
      "/games/skull-king/docs/reference/scoring-quick-ref",
    )
  })
})

describe("resolveDocHref", () => {
  const fromRules = "games/skull-king/rules/00-overview.md"

  it("returns null for external links", () => {
    expect(resolveDocHref(fromRules, "https://example.com")).toBeNull()
    expect(resolveDocHref(fromRules, "#setup")).toBeNull()
  })

  it("passes through absolute app paths", () => {
    expect(resolveDocHref(fromRules, "/games/skull-king/play")).toBe("/games/skull-king/play")
  })

  it("maps sibling rules links", () => {
    expect(resolveDocHref(fromRules, "./06-scoring.md")).toBe(
      "/games/skull-king/docs/rules/06-scoring",
    )
  })

  it("maps app guide links", () => {
    expect(resolveDocHref(fromRules, "../app/play.md")).toBe("/games/skull-king/docs/play")
  })

  it("maps shared glossary links", () => {
    expect(resolveDocHref(fromRules, "../../shared/glossary.md")).toBe("/docs/shared/glossary")
  })

  it("maps reference links", () => {
    expect(resolveDocHref("games/skull-king/rules/06-scoring.md", "../reference/scoring-quick-ref.md")).toBe(
      "/games/skull-king/docs/reference/scoring-quick-ref",
    )
  })
})
