import { describe, expect, it } from "vitest"

import { createCard } from "@/lib/games/skull-king/engine/cards"
import { getLegalCards, isLegalPlay } from "@/lib/games/skull-king/engine/legal-moves"
import { createPlayedCard } from "@/lib/games/skull-king/engine/trick-resolution"

describe("legal-moves", () => {
  const green7 = createCard({ kind: "suited", suit: "green", rank: 7 })
  const green12 = createCard({ kind: "suited", suit: "green", rank: 12 })
  const purple14 = createCard({ kind: "suited", suit: "purple", rank: 14 })
  const black2 = createCard({ kind: "suited", suit: "black", rank: 2 })
  const yellow12 = createCard({ kind: "suited", suit: "yellow", rank: 12 })
  const pirate = createCard({ kind: "pirate", pirate: "rosie" })
  const escape = createCard({ kind: "escape", index: 0 })

  it("must follow lead suit when held", () => {
    const trick = [createPlayedCard(green7, 0, 0)]
    const hand = [green12, purple14]
    const legal = getLegalCards(hand, trick)
    expect(legal.map((c) => c.id)).toEqual(["green:12"])
  })

  it("special always legal even when holding lead suit", () => {
    const trick = [createPlayedCard(green7, 0, 0)]
    const hand = [green12, pirate]
    const legal = getLegalCards(hand, trick)
    expect(legal).toHaveLength(2)
    expect(isLegalPlay(hand, trick, pirate.id)).toBe(true)
  })

  it("cannot play black trump when holding led standard suit", () => {
    const trick = [createPlayedCard(yellow12, 0, 0)]
    const hand = [createCard({ kind: "suited", suit: "yellow", rank: 5 }), black2]
    const legal = getLegalCards(hand, trick)
    expect(legal.map((c) => c.id)).toEqual(["yellow:5"])
  })

  it("may play any card when void in lead suit", () => {
    const trick = [createPlayedCard(yellow12, 0, 0)]
    const hand = [purple14, black2, escape]
    expect(getLegalCards(hand, trick)).toHaveLength(3)
  })

  it("character lead allows any card", () => {
    const trick = [createPlayedCard(pirate, 0, 0)]
    const hand = [green7, purple14]
    expect(getLegalCards(hand, trick)).toHaveLength(2)
  })
})
