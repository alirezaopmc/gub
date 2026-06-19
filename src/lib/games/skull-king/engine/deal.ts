import { buildDeck, type DeckConfig } from "./deck"
import type { Card } from "./types"

/** Mulberry32 PRNG — seedable for deterministic tests. */
export function createRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleDeck(deck: Card[], rng: () => number): Card[] {
  const out = [...deck]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

/** Effective hand size capped when deck cannot deal full schema round. */
export function effectiveHandSize(
  schemaHandSize: number,
  playerCount: number,
  deckCardCount: number
): number {
  const maxPerPlayer = Math.floor(deckCardCount / playerCount)
  return Math.min(schemaHandSize, maxPerPlayer)
}

export type DealResult = {
  hands: Card[][]
  undealt: Card[]
  handSize: number
}

export function dealRound(
  config: DeckConfig,
  playerCount: number,
  schemaHandSize: number,
  rng: () => number
): DealResult {
  const deck = shuffleDeck(buildDeck(config), rng)
  const handSize = effectiveHandSize(schemaHandSize, playerCount, deck.length)
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])
  let cursor = 0
  for (let c = 0; c < handSize; c++) {
    for (let p = 0; p < playerCount; p++) {
      hands[p]!.push(deck[cursor]!)
      cursor++
    }
  }
  return { hands, undealt: deck.slice(cursor), handSize }
}

export function leftOf(dealerIndex: number, playerCount: number): number {
  return (dealerIndex + 1) % playerCount
}
