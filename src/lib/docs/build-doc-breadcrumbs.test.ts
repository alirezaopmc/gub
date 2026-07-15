import { describe, expect, it } from "vitest"

import { buildDocBreadcrumbs } from "@/lib/docs/build-doc-breadcrumbs"
import { loadDoc } from "@/lib/docs/load-doc"

describe("buildDocBreadcrumbs", () => {
  it("builds rules breadcrumbs with section root link", () => {
    const { frontmatter } = loadDoc("games/skull-king/rules/06-scoring.md")
    const crumbs = buildDocBreadcrumbs("skull-king", frontmatter)

    expect(crumbs).toEqual([
      { label: "Rules", href: "/games/skull-king/docs/rules/00-overview" },
      { label: "Scoring" },
    ])
  })

  it("builds reference breadcrumbs", () => {
    const { frontmatter } = loadDoc("games/skull-king/reference/scoring-quick-ref.md")
    const crumbs = buildDocBreadcrumbs("skull-king", frontmatter)

    expect(crumbs[0]).toEqual({
      label: "Quick reference",
      href: "/games/skull-king/docs/reference/trick-resolution",
    })
    expect(crumbs[1]).toEqual({ label: "Scoring quick reference" })
  })

  it("builds app breadcrumbs", () => {
    const { frontmatter } = loadDoc("games/skull-king/app/play.md")
    const crumbs = buildDocBreadcrumbs("skull-king", frontmatter)

    expect(crumbs[0]).toEqual({
      label: "App guides",
      href: "/games/skull-king/docs/hub",
    })
    expect(crumbs[1]?.label).toBeTruthy()
  })
})
