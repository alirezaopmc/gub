import { isEscapeLike, isSpecial } from "./cards";
import { leadContextForNextPlay, mustFollowSuit } from "./lead-suit";
import type {
  Card,
  PlayedCard,
  RuleFlags,
  StandardSuit,
  TigressMode,
} from "./types";

export function handHasSuit(
  hand: readonly Card[],
  suit: StandardSuit,
): boolean {
  return hand.some((c) => c.def.kind === "suited" && c.def.suit === suit);
}

/**
 * Legal plays per rulebook: specials always legal; suited must follow lead suit when held.
 * Black trump cannot be played if you hold the led standard suit.
 */
export function getLegalCards(
  hand: readonly Card[],
  currentTrick: readonly PlayedCard[],
  flags?: RuleFlags,
): Card[] {
  const ctx = leadContextForNextPlay(currentTrick, flags);

  if (!mustFollowSuit(ctx)) {
    return [...hand];
  }

  const lead = ctx.leadSuit!;
  if (!handHasSuit(hand, lead)) {
    return [...hand];
  }

  return hand.filter((c) => {
    if (isSpecial(c)) return true;
    if (c.def.kind !== "suited") return false;
    return c.def.suit === lead;
  });
}

export function isLegalPlay(
  hand: readonly Card[],
  currentTrick: readonly PlayedCard[],
  cardId: string,
  tigressMode?: TigressMode,
  flags?: RuleFlags,
): boolean {
  const card = hand.find((c) => c.id === cardId);
  if (!card) return false;

  if (card.def.kind === "tigress" && !tigressMode) return false;

  const legal = getLegalCards(hand, currentTrick, flags);
  if (!legal.some((c) => c.id === cardId)) return false;

  return true;
}

/**
 * Legal moves for a player during trick play.
 * Mid-trick Kraken/Whale does NOT lift follow-suit obligations for subsequent players.
 */
export function getLegalCardsForPlayer(
  hand: readonly Card[],
  currentTrick: readonly PlayedCard[],
  flags?: RuleFlags,
): Card[] {
  return getLegalCards(hand, currentTrick, flags);
}

export function trickHasOnlyEscapeLike(plays: readonly PlayedCard[]): boolean {
  if (plays.length === 0) return false;
  return plays.every((p) => isEscapeLike(p.card, p.tigressMode));
}
