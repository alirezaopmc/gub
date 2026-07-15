import { describe, expect, it } from "vitest"

import { buildGameDocNav } from "@/lib/docs/build-game-doc-nav"

describe("buildGameDocNav", () => {
  it("builds skull-king nav with three groups", () => {
    const nav = buildGameDocNav("skull-king")

    expect(nav.gameTitle).toBe("Skull King")
    expect(nav.groups.map((g) => g.section)).toEqual(["rules", "reference", "app"])
    expect(nav.groups[0].label).toBe("Rules")
    expect(nav.groups[1].label).toBe("Quick reference")
    expect(nav.groups[2].label).toBe("App guides")
  })

  it("sorts rules by order frontmatter", () => {
    const rules = buildGameDocNav("skull-king").groups.find((g) => g.section === "rules")
    expect(rules?.items[0].href).toBe("/games/skull-king/docs/rules/00-overview")
    expect(rules?.items[rules.items.length - 1].href).toBe("/games/skull-king/docs/rules/10-faq")
  })

  it("maps hrefs to app routes", () => {
    const nav = buildGameDocNav("skull-king")
    const scoring = nav.groups
      .find((g) => g.section === "rules")
      ?.items.find((i) => i.title === "Scoring")
    expect(scoring?.href).toBe("/games/skull-king/docs/rules/06-scoring")

    const play = nav.groups.find((g) => g.section === "app")?.items.find((i) => i.title.includes("Play"))
    expect(play?.href).toBe("/games/skull-king/docs/play")
  })
})
