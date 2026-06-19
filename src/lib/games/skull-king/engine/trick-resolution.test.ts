import { describe, expect, it } from "vitest"

import { createCard } from "@/lib/games/skull-king/engine/cards"
import { createPlayedCard, resolveTrick } from "@/lib/games/skull-king/engine/trick-resolution"

function play(
  card: ReturnType<typeof createCard>,
  seat: number,
  order: number,
  tigressMode?: "pirate" | "escape"
) {
  return createPlayedCard(card, seat, order, tigressMode)
}

describe("trick-resolution suited", () => {
  it("same suit highest wins", () => {
    const g7 = createCard({ kind: "suited", suit: "green", rank: 7 })
    const g12 = createCard({ kind: "suited", suit: "green", rank: 12 })
    const g8 = createCard({ kind: "suited", suit: "green", rank: 8 })
    const result = resolveTrick([play(g7, 0, 0), play(g12, 1, 1), play(g8, 2, 2)], 3)
    expect(result.outcome.type).toBe("won")
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(1)
  })

  it("off-suit standard loses", () => {
    const y12 = createCard({ kind: "suited", suit: "yellow", rank: 12 })
    const y5 = createCard({ kind: "suited", suit: "yellow", rank: 5 })
    const p14 = createCard({ kind: "suited", suit: "purple", rank: 14 })
    const result = resolveTrick([play(y12, 0, 0), play(y5, 1, 1), play(p14, 2, 2)], 3)
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(0)
  })

  it("black trumps standard suit", () => {
    const y12 = createCard({ kind: "suited", suit: "yellow", rank: 12 })
    const y5 = createCard({ kind: "suited", suit: "yellow", rank: 5 })
    const b2 = createCard({ kind: "suited", suit: "black", rank: 2 })
    const result = resolveTrick([play(y12, 0, 0), play(y5, 1, 1), play(b2, 2, 2)], 3)
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(2)
  })
})

describe("trick-resolution specials", () => {
  const pirate = createCard({ kind: "pirate", pirate: "rosie" })
  const king = createCard({ kind: "skull_king" })
  const mermaid = createCard({ kind: "mermaid", mermaid: "alyra" })
  const escape = createCard({ kind: "escape", index: 0 })
  const g14 = createCard({ kind: "suited", suit: "green", rank: 14 })

  it("pirate beats suited", () => {
    const y14 = createCard({ kind: "suited", suit: "yellow", rank: 14 })
    const result = resolveTrick([play(y14, 0, 0), play(pirate, 1, 1)], 2)
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(1)
  })

  it("skull king beats pirate", () => {
    const result = resolveTrick([play(pirate, 0, 0), play(king, 1, 1)], 2)
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(1)
  })

  it("mermaid beats skull king", () => {
    const result = resolveTrick([play(king, 0, 0), play(mermaid, 1, 1)], 2)
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(1)
  })

  it("pirate beats mermaid", () => {
    const result = resolveTrick([play(mermaid, 0, 0), play(pirate, 1, 1)], 2)
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(1)
  })

  it("triple trick mermaid wins", () => {
    const result = resolveTrick(
      [play(pirate, 0, 0), play(king, 1, 1), play(mermaid, 2, 2)],
      3
    )
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(2)
    expect(result.captures.some((c) => c.type === "king_by_mermaid")).toBe(true)
    expect(result.captures.some((c) => c.type === "pirate_by_king")).toBe(false)
  })

  it("first pirate wins among pirates", () => {
    const p2 = createCard({ kind: "pirate", pirate: "bendt" })
    const result = resolveTrick([play(pirate, 0, 0), play(p2, 1, 1)], 2)
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(0)
  })

  it("escape loses", () => {
    const result = resolveTrick([play(g14, 0, 0), play(escape, 1, 1)], 2)
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(0)
  })

  it("all escapes first wins", () => {
    const e2 = createCard({ kind: "escape", index: 1 })
    const result = resolveTrick([play(escape, 0, 0), play(e2, 1, 1)], 2)
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(0)
  })
})

describe("trick-resolution advanced", () => {
  const kraken = createCard({ kind: "kraken" })
  const whale = createCard({ kind: "whale" })
  const b2 = createCard({ kind: "suited", suit: "black", rank: 2 })
  const pirate = createCard({ kind: "pirate", pirate: "rosie" })
  const y14 = createCard({ kind: "suited", suit: "yellow", rank: 14 })
  const king = createCard({ kind: "skull_king" })

  it("kraken destroys trick", () => {
    const result = resolveTrick([play(b2, 0, 0), play(kraken, 1, 1)], 2)
    expect(result.outcome.type).toBe("destroyed")
  })

  it("whale highest number wins", () => {
    const result = resolveTrick(
      [play(b2, 0, 0), play(pirate, 1, 1), play(y14, 2, 2), play(king, 3, 3), play(whale, 4, 4)],
      5
    )
    expect(result.outcome.type).toBe("won")
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(2)
  })

  it("kraken then whale uses whale", () => {
    const result = resolveTrick(
      [play(b2, 0, 0), play(kraken, 1, 1), play(y14, 2, 2), play(whale, 3, 3)],
      4
    )
    expect(result.outcome.type).toBe("won")
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(2)
  })

  it("loot alliance when loot played and someone else wins", () => {
    const loot = createCard({ kind: "loot", index: 0 })
    const g10 = createCard({ kind: "suited", suit: "green", rank: 10 })
    const result = resolveTrick([play(loot, 0, 0), play(g10, 1, 1)], 2)
    expect(result.lootAlliance).toEqual({ lootPlayerIndex: 0, trickWinnerIndex: 1 })
  })
})

describe("rulebook Lawrence example", () => {
  it("mermaid captures king with 14 bonus", () => {
    const y14 = createCard({ kind: "suited", suit: "yellow", rank: 14 })
    const pirate = createCard({ kind: "pirate", pirate: "rosie" })
    const king = createCard({ kind: "skull_king" })
    const mermaid = createCard({ kind: "mermaid", mermaid: "sirena" })
    const result = resolveTrick(
      [play(y14, 0, 0), play(pirate, 1, 1), play(king, 2, 2), play(mermaid, 3, 3)],
      4
    )
    if (result.outcome.type === "won") expect(result.outcome.winnerIndex).toBe(3)
    expect(result.captures.filter((c) => c.type === "fourteen")).toHaveLength(1)
    expect(result.captures.some((c) => c.type === "king_by_mermaid")).toBe(true)
  })
})
