import { describe, expect, it } from "vitest"

import { listSharedDocSlugs } from "@/lib/docs/list-shared-doc-slugs"

describe("listSharedDocSlugs", () => {
  it("lists top-level shared docs", () => {
    expect(listSharedDocSlugs()).toContain("glossary")
  })
})
