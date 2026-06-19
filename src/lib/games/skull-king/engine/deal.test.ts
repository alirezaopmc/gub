import { describe, expect, it } from "vitest"

import { createRng, dealRound, effectiveHandSize } from "@/lib/games/skull-king/engine/deal"
import { BASE_DECK_CONFIG } from "@/lib/games/skull-king/engine/deck"

describe("deal", () => {
  it("deals round 3 with 3 cards each for 4 players", () => {
    const { hands, handSize, undealt } = dealRound(BASE_DECK_CONFIG, 4, 3, createRng(1))
    expect(handSize).toBe(3)
    expect(hands).toHaveLength(4)
    hands.forEach((h) => expect(h).toHaveLength(3))
    expect(undealt).toHaveLength(70 - 12)
  })

  it("caps hand size for 8 players round 9-10", () => {
    expect(effectiveHandSize(9, 8, 70)).toBe(8)
    expect(effectiveHandSize(10, 8, 70)).toBe(8)
  })

  it("caps hand size generally when deck too small", () => {
    expect(effectiveHandSize(10, 7, 70)).toBe(10)
  })

  it("shuffle is deterministic with seed", () => {
    const a = dealRound(BASE_DECK_CONFIG, 3, 2, createRng(42))
    const b = dealRound(BASE_DECK_CONFIG, 3, 2, createRng(42))
    expect(a.hands.map((h) => h.map((c) => c.id))).toEqual(b.hands.map((h) => h.map((c) => c.id)))
  })
})
