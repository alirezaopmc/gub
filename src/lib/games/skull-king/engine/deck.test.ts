import { describe, expect, it } from "vitest"

import { buildDeck, deckSize, BASE_DECK_CONFIG, FULL_DECK_CONFIG } from "@/lib/games/skull-king/engine/deck"
import { createCard } from "@/lib/games/skull-king/engine/cards"

describe("deck", () => {
  it("base deck has 70 cards", () => {
    const deck = buildDeck(BASE_DECK_CONFIG)
    expect(deck).toHaveLength(70)
    expect(deckSize(BASE_DECK_CONFIG)).toBe(70)
  })

  it("full advanced deck has 74 cards", () => {
    const deck = buildDeck(FULL_DECK_CONFIG)
    expect(deck).toHaveLength(74)
  })

  it("has five distinct escape card ids", () => {
    const deck = buildDeck(BASE_DECK_CONFIG)
    const escapes = deck.filter((c) => c.def.kind === "escape")
    expect(escapes).toHaveLength(5)
    const ids = new Set(escapes.map((c) => c.id))
    expect(ids.size).toBe(5)
  })

  it("has 56 suited cards", () => {
    const deck = buildDeck(BASE_DECK_CONFIG)
    expect(deck.filter((c) => c.def.kind === "suited")).toHaveLength(56)
  })

  it("all card ids unique", () => {
    const deck = buildDeck(FULL_DECK_CONFIG)
    expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length)
  })

  it("createCard ids stable", () => {
    expect(createCard({ kind: "suited", suit: "green", rank: 7 }).id).toBe("green:7")
    expect(createCard({ kind: "escape", index: 2 }).id).toBe("escape:2")
  })
})
