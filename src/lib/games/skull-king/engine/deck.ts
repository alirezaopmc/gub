import { cardId, createCard } from "./cards"
import type { Card, MermaidId, PirateId } from "./types"

export type DeckConfig = {
  includeKraken: boolean
  includeWhale: boolean
  includeLoot: boolean
}

const PIRATES: PirateId[] = ["rosie", "bendt", "rascal", "juanita", "harry"]
const MERMAIDS: MermaidId[] = ["alyra", "sirena"]
const SUITS = ["green", "yellow", "purple", "black"] as const

/** Base deck: 70 cards (no Kraken, Whale, Loot). Full advanced: 74. */
export function buildDeck(config: DeckConfig): Card[] {
  const cards: Card[] = []

  for (const suit of SUITS) {
    for (let rank = 1; rank <= 14; rank++) {
      cards.push(createCard({ kind: "suited", suit, rank }))
    }
  }

  for (let i = 0; i < 5; i++) {
    cards.push(createCard({ kind: "escape", index: i }))
  }

  for (const pirate of PIRATES) {
    cards.push(createCard({ kind: "pirate", pirate }))
  }

  cards.push(createCard({ kind: "tigress" }))
  cards.push(createCard({ kind: "skull_king" }))

  for (const mermaid of MERMAIDS) {
    cards.push(createCard({ kind: "mermaid", mermaid }))
  }

  if (config.includeKraken) {
    cards.push(createCard({ kind: "kraken" }))
  }
  if (config.includeWhale) {
    cards.push(createCard({ kind: "whale" }))
  }
  if (config.includeLoot) {
    cards.push(createCard({ kind: "loot", index: 0 }))
    cards.push(createCard({ kind: "loot", index: 1 }))
  }

  return cards
}

export function deckSize(config: DeckConfig): number {
  let n = 70
  if (config.includeKraken) n++
  if (config.includeWhale) n++
  if (config.includeLoot) n += 2
  return n
}

export function findCardById(deck: Card[], id: string): Card | undefined {
  return deck.find((c) => c.id === id)
}

export function removeCardFromHand(hand: Card[], cardIdStr: string): Card | null {
  const idx = hand.findIndex((c) => c.id === cardIdStr)
  if (idx < 0) return null
  const [card] = hand.splice(idx, 1)
  return card ?? null
}

export function allCardIds(deck: Card[]): string[] {
  return deck.map((c) => c.id)
}

/** Ensure deck has unique ids (for tests). */
export function assertUniqueDeck(deck: Card[]): void {
  const ids = new Set(deck.map((c) => c.id))
  if (ids.size !== deck.length) {
    throw new Error("duplicate card ids in deck")
  }
}

export const BASE_DECK_CONFIG: DeckConfig = {
  includeKraken: false,
  includeWhale: false,
  includeLoot: false,
}

export const FULL_DECK_CONFIG: DeckConfig = {
  includeKraken: true,
  includeWhale: true,
  includeLoot: true,
}
