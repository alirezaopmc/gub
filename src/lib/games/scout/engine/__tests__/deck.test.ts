import { describe, expect, it } from "vitest";
import {
  buildFullScoutDeck,
  createScoutCard,
  dealHands,
  getActiveValue,
  getDeckForPlayerCount,
} from "../deck";

describe("Scout Deck Engine", () => {
  it("generates exact 45 cards in full deck with unique combinations", () => {
    const deck = buildFullScoutDeck();
    expect(deck).toHaveLength(45);

    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(45);

    // Each card must satisfy 1 <= top < bottom <= 10
    for (const card of deck) {
      expect(card.top).toBeGreaterThanOrEqual(1);
      expect(card.top).toBeLessThan(card.bottom);
      expect(card.bottom).toBeLessThanOrEqual(10);
    }
  });

  it("filters out 10s for 3-player games leaving 36 cards", () => {
    const deck3p = getDeckForPlayerCount(3);
    expect(deck3p).toHaveLength(36);
    expect(deck3p.every((c) => c.top !== 10 && c.bottom !== 10)).toBe(true);

    const deck4p = getDeckForPlayerCount(4);
    expect(deck4p).toHaveLength(45);
  });

  it("correctly reports active value based on card orientation", () => {
    const card = createScoutCard(3, 7, true);
    expect(getActiveValue(card)).toBe(3);

    const flipped = { ...card, isTopActive: false };
    expect(getActiveValue(flipped)).toBe(7);
  });

  it("deals correct number of cards per player", () => {
    // 3 players: 12 cards each
    const deck3p = getDeckForPlayerCount(3);
    const { hands: hands3 } = dealHands(deck3p, 3);
    expect(hands3).toHaveLength(3);
    expect(hands3[0]?.cards).toHaveLength(12);
    expect(hands3[1]?.cards).toHaveLength(12);
    expect(hands3[2]?.cards).toHaveLength(12);

    // 4 players: 11 cards each (44 dealt, 1 undealt)
    const deck4p = getDeckForPlayerCount(4);
    const { hands: hands4, undealt: undealt4 } = dealHands(deck4p, 4);
    expect(hands4).toHaveLength(4);
    expect(hands4.every((h) => h.cards.length === 11)).toBe(true);
    expect(undealt4).toHaveLength(1);
  });
});
