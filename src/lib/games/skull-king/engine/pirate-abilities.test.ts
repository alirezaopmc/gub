import { describe, expect, it } from "vitest"

import { abilityRequired, createPendingAbility } from "@/lib/games/skull-king/engine/pirate-abilities"

describe("pirate abilities", () => {
  it("harry allowed on final trick", () => {
    expect(abilityRequired("harry", true, true)).toBe(true)
  })

  it("rosie blocked on final trick", () => {
    expect(abilityRequired("rosie", true, true)).toBe(false)
    expect(createPendingAbility("rosie", 0, 0, true, true)).toBeNull()
  })

  it("creates pending when allowed", () => {
    const p = createPendingAbility("bendt", 2, 1, false, true)
    expect(p?.pirate).toBe("bendt")
  })

  it("disabled when artifacts off", () => {
    expect(createPendingAbility("rosie", 0, 0, false, false)).toBeNull()
  })
})
