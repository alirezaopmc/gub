import { describe, expect, it } from "vitest";

import { createCard } from "@/lib/games/skull-king/engine/cards";
import { getLegalCardsForPlayer } from "@/lib/games/skull-king/engine/legal-moves";
import {
  createPlayedCard,
  resolveLootLeadAllEscapes,
  resolveTrick,
} from "@/lib/games/skull-king/engine/trick-resolution";

describe("advanced edge cases", () => {
  it("loot lead all escapes — loot player wins", () => {
    const loot = createCard({ kind: "loot", index: 0 });
    const e1 = createCard({ kind: "escape", index: 0 });
    const e2 = createCard({ kind: "escape", index: 1 });
    const plays = [
      createPlayedCard(loot, 0, 0),
      createPlayedCard(e1, 1, 1),
      createPlayedCard(e2, 2, 2),
    ];
    expect(resolveLootLeadAllEscapes(plays)).toBe(0);
  });

  it("mid-trick kraken does not lift follow-suit obligation for later players", () => {
    const green7 = createCard({ kind: "suited", suit: "green", rank: 7 });
    const kraken = createCard({ kind: "kraken" });
    const green3 = createCard({ kind: "suited", suit: "green", rank: 3 });
    const yellow14 = createCard({ kind: "suited", suit: "yellow", rank: 14 });

    const trick = [
      createPlayedCard(green7, 0, 0),
      createPlayedCard(kraken, 1, 1),
    ];
    const hand = [green3, yellow14];
    const legal = getLegalCardsForPlayer(hand, trick);
    expect(legal.map((c) => c.id)).toEqual(["green:3"]);
  });

  it("multiple black — highest black wins", () => {
    const y = createCard({ kind: "suited", suit: "yellow", rank: 10 });
    const b3 = createCard({ kind: "suited", suit: "black", rank: 3 });
    const b11 = createCard({ kind: "suited", suit: "black", rank: 11 });
    const result = resolveTrick(
      [
        createPlayedCard(y, 0, 0),
        createPlayedCard(b3, 1, 1),
        createPlayedCard(b11, 2, 2),
      ],
      3,
    );
    if (result.outcome.type === "won")
      expect(result.outcome.winnerIndex).toBe(2);
  });

  it("whale specials-only trick discarded and whale player leads", () => {
    const whale = createCard({ kind: "whale" });
    const pirate = createCard({ kind: "pirate", pirate: "rosie" });
    const result = resolveTrick(
      [createPlayedCard(pirate, 0, 0), createPlayedCard(whale, 1, 1)],
      2,
    );
    expect(result.outcome.type).toBe("discarded");
    if (result.outcome.type === "discarded") {
      expect(result.outcome.wouldBeWinnerIndex).toBe(1);
    }
  });

  it("kraken after whale: kraken destroys trick, would-be winner without creatures leads", () => {
    const whale = createCard({ kind: "whale" });
    const kraken = createCard({ kind: "kraken" });
    const pirate = createCard({ kind: "pirate", pirate: "rosie" });
    const skullKing = createCard({ kind: "skull_king" });

    // Player 0 plays Skull King, Player 1 plays Pirate, Player 2 plays Whale, Player 3 plays Kraken
    const result = resolveTrick(
      [
        createPlayedCard(skullKing, 0, 0),
        createPlayedCard(pirate, 1, 1),
        createPlayedCard(whale, 2, 2),
        createPlayedCard(kraken, 3, 3),
      ],
      4,
    );
    expect(result.outcome.type).toBe("destroyed");
    if (result.outcome.type === "destroyed") {
      // Skull King beats Pirate, so player 0 would have won
      expect(result.outcome.wouldBeWinnerIndex).toBe(0);
    }
  });

  it("whale after kraken with only specials: trick discarded and whale player leads", () => {
    const kraken = createCard({ kind: "kraken" });
    const whale = createCard({ kind: "whale" });
    const pirate = createCard({ kind: "pirate", pirate: "rosie" });

    const result = resolveTrick(
      [
        createPlayedCard(pirate, 0, 0),
        createPlayedCard(kraken, 1, 1),
        createPlayedCard(whale, 2, 2),
      ],
      3,
    );
    expect(result.outcome.type).toBe("discarded");
    if (result.outcome.type === "discarded") {
      expect(result.outcome.wouldBeWinnerIndex).toBe(2);
    }
  });
});
