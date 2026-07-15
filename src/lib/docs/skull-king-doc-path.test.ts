import { describe, expect, it } from "vitest"

import { skullKingDocPath } from "@/lib/docs/skull-king-doc-path"

describe("skullKingDocPath", () => {
  it("maps rules slug to relative path", () => {
    expect(skullKingDocPath("rules", "06-scoring")).toBe(
      "games/skull-king/rules/06-scoring.md",
    )
    expect(skullKingDocPath("rules", "00-overview")).toBe(
      "games/skull-king/rules/00-overview.mdx",
    )
    expect(skullKingDocPath("rules", "07-advanced-cards")).toBe(
      "games/skull-king/rules/07-advanced-cards.mdx",
    )
  })

  it("maps reference slug to relative path", () => {
    expect(skullKingDocPath("reference", "scoring-quick-ref")).toBe(
      "games/skull-king/reference/scoring-quick-ref.md",
    )
  })

  it("maps app slug to relative path", () => {
    expect(skullKingDocPath("app", "play")).toBe("games/skull-king/app/play.md")
  })
})
