import { describe, expect, it } from "vitest"

import { skullKingDocPath } from "@/lib/docs/skull-king-doc-path"

describe("skullKingDocPath", () => {
  it("maps rules slug to relative path", () => {
    expect(skullKingDocPath("rules", "06-scoring")).toBe(
      "games/skull-king/rules/06-scoring.md",
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
