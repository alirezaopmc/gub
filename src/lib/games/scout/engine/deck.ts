import type { PlayerHand, ScoutCard } from "./types";

export function createScoutCard(
  top: number,
  bottom: number,
  isTopActive = true,
): ScoutCard {
  return {
    id: `card-${top}-${bottom}`,
    top,
    bottom,
    isTopActive,
  };
}

export function getActiveValue(card: ScoutCard): number {
  return card.isTopActive ? card.top : card.bottom;
}

/** Generates the full 45-card standard Scout deck (pairs 1..10 where top < bottom). */
export function buildFullScoutDeck(): ScoutCard[] {
  const cards: ScoutCard[] = [];
  for (let top = 1; top <= 9; top++) {
    for (let bottom = top + 1; bottom <= 10; bottom++) {
      cards.push(createScoutCard(top, bottom, true));
    }
  }
  return cards;
}

/** Prepares a deck filtered by player count according to official Scout rules. */
export function getDeckForPlayerCount(playerCount: number): ScoutCard[] {
  const deck = buildFullScoutDeck();
  if (playerCount === 3) {
    // 3-player game: remove all cards with value 10 (leaving 36 cards)
    return deck.filter((c) => c.top !== 10 && c.bottom !== 10);
  }
  return deck;
}

/**
 * Fisher-Yates shuffle with optional deterministic PRNG seed or array.
 */
export function shuffleCards(
  cards: ScoutCard[],
  randomFn = Math.random,
): ScoutCard[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  // Randomize card initial orientation upon deal
  return result.map((c) => ({
    ...c,
    isTopActive: randomFn() > 0.5,
  }));
}

export function dealHands(
  deck: ScoutCard[],
  playerCount: number,
): { hands: PlayerHand[]; undealt: ScoutCard[] } {
  let cardsPerPlayer = 11;
  if (playerCount === 3) cardsPerPlayer = 12;
  else if (playerCount === 4) cardsPerPlayer = 11;
  else if (playerCount === 5) cardsPerPlayer = 9;

  const hands: PlayerHand[] = Array.from({ length: playerCount }, (_, i) => ({
    seatIndex: i,
    cards: [],
    hasScoutAndShowAvailable: true,
    scorePileCount: 0,
    scoutChips: 0,
  }));

  let deckIndex = 0;
  for (let cardNum = 0; cardNum < cardsPerPlayer; cardNum++) {
    for (let player = 0; player < playerCount; player++) {
      if (deckIndex < deck.length) {
        hands[player]!.cards.push(deck[deckIndex]!);
        deckIndex++;
      }
    }
  }

  const undealt = deck.slice(deckIndex);
  return { hands, undealt };
}
