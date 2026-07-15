import { describe, expect, it } from "vitest"

import { renderDoc } from "@/lib/docs/render-doc"

describe("renderDoc", () => {
  it("compiles fixture markdown to a React component", async () => {
    const { Content, frontmatter, relativePath } = await renderDoc("__fixtures__/sample.md")

    expect(frontmatter.title).toBe("Sample doc")
    expect(relativePath).toBe("__fixtures__/sample.md")
    expect(typeof Content).toBe("function")
  })

  it("compiles real scoring doc with GFM tables", async () => {
    const { Content, frontmatter } = await renderDoc("games/skull-king/rules/06-scoring.md")

    expect(frontmatter.title).toBe("Scoring")
    expect(typeof Content).toBe("function")
  })
})
