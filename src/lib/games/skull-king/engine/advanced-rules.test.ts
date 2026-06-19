import { describe, expect, it } from "vitest"

import { createCard } from "@/lib/games/skull-king/engine/cards"
import { getLegalCardsAfterMidTrickSpecial } from "@/lib/games/skull-king/engine/legal-moves"
import { createPlayedCard, resolveLootLeadAllEscapes, resolveTrick } from "@/lib/games/skull-king/engine/trick-resolution"

describe("advanced edge cases", () => {
  it("loot lead all escapes — loot player wins", () => {
    const loot = createCard({ kind: "loot", index: 0 })
    const e1 = createCard({ kind: "escape", index: 0 })
    const e2 = createCard({ kind: "escape", index: 1 })
    const plays = [
      createPlayedCard(loot, 0, 0),
      createPlayedCard(e1, 1, 1),
      createPlayedCard(e2, 2, 2),
    ]
    expect(resolveLootLeadAllEscapes(plays)).toBe(0)
  })

  it("kraken mid-trick frees follow suit", () => {
    const hand = [
      createCard({ kind: "suited", suit: "green", rank: 3 }),
      createCard({ kind: "suited", suit: "yellow", rank: 14 }),
    ]
    expect(getLegalCardsAfterMidTrickSpecial(hand)).toHaveLength(2)
  })

  it("multiple black — highest black wins", () => {
    const y = createCard({ kind: "suited", suit: "yellow", rank: 10 })
    const b3 = createCard({ kind: "suited", suit: "black", rank: 3 })
    const b11 = createCard({ kind: "suited", suit: "black", rank: 11 })
    const result = resolveTrick(
      [
        createPlayedCard(y, 0, 0),
        createPlayedCard(b3, 1, 1),
        createPlayedCard(b11, 2, 2),
      ],
      3
    )
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(2)
  })

  it("whale specials-only trick discarded", () => {
    const whale = createCard({ kind: "whale" })
    const pirate = createCard({ kind: "pirate", pirate: "rosie" })
    const result = resolveTrick(
      [createPlayedCard(pirate, 0, 0), createPlayedCard(whale, 1, 1)],
      2
    )
    expect(result.outcome.type).toBe("discarded")
  })
})
