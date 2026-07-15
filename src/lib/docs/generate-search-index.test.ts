import { mkdirSync, writeFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { buildGameDocSearchIndex } from "@/lib/docs/build-game-doc-search-index"

describe("generate docs search index", () => {
  it("writes public/games/skull-king/docs-search.json", () => {
    const index = buildGameDocSearchIndex("skull-king")
    mkdirSync("public/games/skull-king", { recursive: true })
    writeFileSync(
      "public/games/skull-king/docs-search.json",
      `${JSON.stringify(index, null, 2)}\n`,
    )
    expect(index.length).toBeGreaterThan(0)
  })
})
