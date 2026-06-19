import { isEscapeLike, isSpecial } from "./cards"
import { leadContextForNextPlay, mustFollowSuit } from "./lead-suit"
import type { Card, PlayedCard, StandardSuit, TigressMode } from "./types"

export function handHasSuit(hand: readonly Card[], suit: StandardSuit): boolean {
  return hand.some((c) => c.def.kind === "suited" && c.def.suit === suit)
}

/**
 * Legal plays per rulebook: specials always legal; suited must follow lead suit when held.
 * Black trump cannot be played if you hold the led standard suit.
 */
export function getLegalCards(
  hand: readonly Card[],
  currentTrick: readonly PlayedCard[]
): Card[] {
  const ctx = leadContextForNextPlay(currentTrick)

  if (!mustFollowSuit(ctx)) {
    return [...hand]
  }

  const lead = ctx.leadSuit!
  if (!handHasSuit(hand, lead)) {
    return [...hand]
  }

  return hand.filter((c) => {
    if (isSpecial(c)) return true
    if (c.def.kind !== "suited") return false
    return c.def.suit === lead
  })
}

export function isLegalPlay(
  hand: readonly Card[],
  currentTrick: readonly PlayedCard[],
  cardId: string,
  tigressMode?: TigressMode
): boolean {
  const card = hand.find((c) => c.id === cardId)
  if (!card) return false

  if (card.def.kind === "tigress" && !tigressMode) return false

  const legal = getLegalCards(hand, currentTrick)
  if (!legal.some((c) => c.id === cardId)) return false

  return true
}

/** After Kraken/Whale mid-trick, following plays need not follow suit. */
export function getLegalCardsAfterMidTrickSpecial(hand: readonly Card[]): Card[] {
  return [...hand]
}

export function isMidTrickSpecialUnlocked(plays: readonly PlayedCard[]): boolean {
  return plays.some(
    (p) => p.card.def.kind === "kraken" || p.card.def.kind === "whale"
  )
}

export function getLegalCardsForPlayer(
  hand: readonly Card[],
  currentTrick: readonly PlayedCard[]
): Card[] {
  if (isMidTrickSpecialUnlocked(currentTrick)) {
    return getLegalCardsAfterMidTrickSpecial(hand)
  }
  return getLegalCards(hand, currentTrick)
}

export function trickHasOnlyEscapeLike(plays: readonly PlayedCard[]): boolean {
  if (plays.length === 0) return false
  return plays.every((p) => isEscapeLike(p.card, p.tigressMode))
}
