import { describe, expect, it } from "vitest";

import { effectiveTricksBid } from "@/lib/games/skull-king/round-score/bid-won-validation";
import {
  clampCharacterCaptureCount,
  computeRoundScoreBreakdown,
  previewActiveBonus,
  scoreAlliance,
  scoreBidWon,
  scoreFourteenBonus,
  scoreHeroCaptures,
  scoreRascal,
} from "@/lib/games/skull-king/round-score/score-rules";
import {
  MAX_MERMAIDS_IN_GAME,
  MAX_PIRATES_IN_GAME,
  type PlayerRoundData,
  type RoundEvent,
} from "@/lib/games/skull-king/round-score/types";

describe("clampCharacterCaptureCount", () => {
  describe("mermaid capturing Skull King", () => {
    it("always returns 1 for mermaid regardless of raw count", () => {
      expect(clampCharacterCaptureCount("mermaid", 1)).toBe(1);
      expect(clampCharacterCaptureCount("mermaid", 2)).toBe(1);
      expect(clampCharacterCaptureCount("mermaid", 5)).toBe(1);
      expect(clampCharacterCaptureCount("mermaid", 100)).toBe(1);
    });

    it("handles zero, negative numbers, floats, and non-finite values for mermaid", () => {
      expect(clampCharacterCaptureCount("mermaid", 0)).toBe(1);
      expect(clampCharacterCaptureCount("mermaid", -3)).toBe(1);
      expect(clampCharacterCaptureCount("mermaid", 2.7)).toBe(1);
      expect(clampCharacterCaptureCount("mermaid", Number.NaN)).toBe(1);
      expect(clampCharacterCaptureCount("mermaid", Number.POSITIVE_INFINITY)).toBe(1);
    });
  });

  describe("pirate capturing Mermaid(s)", () => {
    it("preserves valid counts up to MAX_MERMAIDS_IN_GAME (2)", () => {
      expect(clampCharacterCaptureCount("pirate", 1)).toBe(1);
      expect(clampCharacterCaptureCount("pirate", 2)).toBe(2);
      expect(clampCharacterCaptureCount("pirate", MAX_MERMAIDS_IN_GAME)).toBe(2);
    });

    it("clamps counts exceeding MAX_MERMAIDS_IN_GAME to 2", () => {
      expect(clampCharacterCaptureCount("pirate", 3)).toBe(2);
      expect(clampCharacterCaptureCount("pirate", 10)).toBe(2);
    });

    it("handles zero, negative numbers, floats, and non-finite values for pirate", () => {
      expect(clampCharacterCaptureCount("pirate", 0)).toBe(1);
      expect(clampCharacterCaptureCount("pirate", -1)).toBe(1);
      expect(clampCharacterCaptureCount("pirate", 2.9)).toBe(2);
      expect(clampCharacterCaptureCount("pirate", 0.8)).toBe(1);
      expect(clampCharacterCaptureCount("pirate", Number.NaN)).toBe(1);
      expect(clampCharacterCaptureCount("pirate", Number.NEGATIVE_INFINITY)).toBe(1);
    });
  });

  describe("king capturing Pirate(s)", () => {
    it("preserves valid counts up to MAX_PIRATES_IN_GAME (5)", () => {
      expect(clampCharacterCaptureCount("king", 1)).toBe(1);
      expect(clampCharacterCaptureCount("king", 2)).toBe(2);
      expect(clampCharacterCaptureCount("king", 3)).toBe(3);
      expect(clampCharacterCaptureCount("king", 4)).toBe(4);
      expect(clampCharacterCaptureCount("king", 5)).toBe(5);
      expect(clampCharacterCaptureCount("king", MAX_PIRATES_IN_GAME)).toBe(5);
    });

    it("clamps counts exceeding MAX_PIRATES_IN_GAME to 5", () => {
      expect(clampCharacterCaptureCount("king", 6)).toBe(5);
      expect(clampCharacterCaptureCount("king", 50)).toBe(5);
    });

    it("handles zero, negative numbers, floats, and non-finite values for king", () => {
      expect(clampCharacterCaptureCount("king", 0)).toBe(1);
      expect(clampCharacterCaptureCount("king", -5)).toBe(1);
      expect(clampCharacterCaptureCount("king", 4.6)).toBe(4);
      expect(clampCharacterCaptureCount("king", Number.NaN)).toBe(1);
      expect(clampCharacterCaptureCount("king", Number.POSITIVE_INFINITY)).toBe(1);
    });
  });
});

describe("scoreBidWon", () => {
  describe("exact positive bid made", () => {
    it("scores 20 points per trick bid when won equals bid", () => {
      expect(scoreBidWon(5, 1, 1)).toBe(20);
      expect(scoreBidWon(5, 3, 3)).toBe(60);
      expect(scoreBidWon(10, 7, 7)).toBe(140);
      expect(scoreBidWon(10, 10, 10)).toBe(200);
    });
  });

  describe("missed positive bid", () => {
    it("penalizes -10 points per trick difference when over or under bid", () => {
      expect(scoreBidWon(5, 2, 4)).toBe(-20); // 2 over
      expect(scoreBidWon(5, 4, 2)).toBe(-20); // 2 under
      expect(scoreBidWon(5, 3, 2)).toBe(-10); // 1 under
      expect(scoreBidWon(5, 1, 4)).toBe(-30); // 3 over
      expect(scoreBidWon(10, 8, 0)).toBe(-80); // 8 under
    });
  });

  describe("zero bid", () => {
    it("scores 10 * handSize when 0-bid is exact (won 0)", () => {
      expect(scoreBidWon(1, 0, 0)).toBe(10);
      expect(scoreBidWon(5, 0, 0)).toBe(50);
      expect(scoreBidWon(7, 0, 0)).toBe(70);
      expect(scoreBidWon(10, 0, 0)).toBe(100);
    });

    it("penalizes -10 * handSize when 0-bid is missed (won > 0)", () => {
      expect(scoreBidWon(1, 0, 1)).toBe(-10);
      expect(scoreBidWon(5, 0, 1)).toBe(-50);
      expect(scoreBidWon(7, 0, 3)).toBe(-70);
      expect(scoreBidWon(9, 0, 2)).toBe(-90);
      expect(scoreBidWon(10, 0, 10)).toBe(-100);
    });
  });

  describe("null and edge inputs", () => {
    it("returns 0 if effectiveBid or won is null", () => {
      expect(scoreBidWon(5, null, 2)).toBe(0);
      expect(scoreBidWon(5, 2, null)).toBe(0);
      expect(scoreBidWon(5, null, null)).toBe(0);
    });

    it("normalizes fractional or negative hand sizes", () => {
      expect(scoreBidWon(5.9, 0, 0)).toBe(50);
      expect(scoreBidWon(-3, 0, 0)).toBe(0);
    });
  });

  describe("Harry the Giant / effective bids scoring", () => {
    it("scores correctly with effective bids derived from Harry the Giant +1 delta", () => {
      const handSize = 5;
      const baseBid = 2;
      const effectiveBid = effectiveTricksBid(handSize, baseBid, 1); // 3
      expect(effectiveBid).toBe(3);
      expect(scoreBidWon(handSize, effectiveBid, 3)).toBe(60);
      expect(scoreBidWon(handSize, effectiveBid, 2)).toBe(-10);
    });

    it("scores correctly with effective bids derived from Harry the Giant -1 delta", () => {
      const handSize = 5;
      const baseBid = 1;
      const effectiveBid = effectiveTricksBid(handSize, baseBid, -1); // 0
      expect(effectiveBid).toBe(0);
      expect(scoreBidWon(handSize, effectiveBid, 0)).toBe(50);
      expect(scoreBidWon(handSize, effectiveBid, 1)).toBe(-50);
    });

    it("scores correctly when base bid is null but Harry delta is set (+1 -> effective 1)", () => {
      const handSize = 5;
      const effectiveBid = effectiveTricksBid(handSize, null, 1); // 1
      expect(effectiveBid).toBe(1);
      expect(scoreBidWon(handSize, effectiveBid, 1)).toBe(20);
    });

    it("clamps Harry delta at hand boundaries", () => {
      const handSize = 5;
      // 0 with -1 clamped to 0
      const minBid = effectiveTricksBid(handSize, 0, -1);
      expect(minBid).toBe(0);
      expect(scoreBidWon(handSize, minBid, 0)).toBe(50);

      // 5 with +1 clamped to 5
      const maxBid = effectiveTricksBid(handSize, 5, 1);
      expect(maxBid).toBe(5);
      expect(scoreBidWon(handSize, maxBid, 5)).toBe(100);
    });
  });
});

describe("scoreFourteenBonus", () => {
  it("awards 20 points for black suit 14 and 10 points for colored suits (green, yellow, purple)", () => {
    expect(
      scoreFourteenBonus([
        { type: "fourteenBonus", playerIndex: 0, suit: "black" },
      ]),
    ).toBe(20);

    expect(
      scoreFourteenBonus([
        { type: "fourteenBonus", playerIndex: 0, suit: "green" },
      ]),
    ).toBe(10);

    expect(
      scoreFourteenBonus([
        { type: "fourteenBonus", playerIndex: 0, suit: "yellow" },
      ]),
    ).toBe(10);

    expect(
      scoreFourteenBonus([
        { type: "fourteenBonus", playerIndex: 0, suit: "purple" },
      ]),
    ).toBe(10);
  });

  it("sums multiple 14 bonuses and ignores other event types", () => {
    const events: RoundEvent[] = [
      { type: "fourteenBonus", playerIndex: 0, suit: "black" },
      { type: "fourteenBonus", playerIndex: 0, suit: "green" },
      { type: "fourteenBonus", playerIndex: 0, suit: "purple" },
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "mermaid",
        count: 1,
      },
      { type: "legacy", kind: "bonus", label: "Bonus" },
    ];
    expect(scoreFourteenBonus(events)).toBe(20 + 10 + 10);
  });

  it("returns 0 when no fourteenBonus events exist", () => {
    expect(scoreFourteenBonus([])).toBe(0);
    expect(
      scoreFourteenBonus([
        { type: "legacy", kind: "coin", label: "+10" },
      ]),
    ).toBe(0);
  });
});

describe("scoreHeroCaptures", () => {
  it("awards 20 points per mermaid captured by pirate", () => {
    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "pirate",
          count: 1,
        },
      ]),
    ).toBe(20);

    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "pirate",
          count: 2,
        },
      ]),
    ).toBe(40);

    // Clamped to 2
    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "pirate",
          count: 4,
        },
      ]),
    ).toBe(40);
  });

  it("awards 30 points per pirate captured by king", () => {
    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "king",
          count: 1,
        },
      ]),
    ).toBe(30);

    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "king",
          count: 3,
        },
      ]),
    ).toBe(90);

    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "king",
          count: 5,
        },
      ]),
    ).toBe(150);

    // Clamped to 5
    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "king",
          count: 8,
        },
      ]),
    ).toBe(150);
  });

  it("awards 40 points for Skull King captured by mermaid (always 1)", () => {
    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "mermaid",
          count: 1,
        },
      ]),
    ).toBe(40);

    // Clamped to 1 even if count is higher
    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "mermaid",
          count: 3,
        },
      ]),
    ).toBe(40);
  });

  it("sums multiple hero capture events", () => {
    const events: RoundEvent[] = [
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "mermaid",
        count: 1,
      }, // 40
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "king",
        count: 2,
      }, // 60
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "pirate",
        count: 1,
      }, // 20
    ];
    expect(scoreHeroCaptures(events)).toBe(40 + 60 + 20);
  });

  it("handles capture event with undefined count fallback", () => {
    const event = {
      type: "characterCapture" as const,
      capturerIndex: 0,
      capturingCard: "king" as const,
      count: undefined as unknown as number,
    };
    expect(scoreHeroCaptures([event])).toBe(30);
  });

  it("returns 0 when no capture events exist", () => {
    expect(scoreHeroCaptures([])).toBe(0);
  });
});

describe("scoreAlliance", () => {
  const makePlayer = (
    bid: number | null,
    won: number | null,
    events: RoundEvent[] = [],
    harryGiantBidDelta: 1 | -1 | null = null,
  ): PlayerRoundData => ({
    bid,
    won,
    events,
    harryGiantBidDelta,
    score: 0,
  });

  it("awards +20 bonus points when both allied players hit their bids", () => {
    const allianceEvent: RoundEvent = {
      type: "alliance",
      lootPlayerIndex: 0,
      trickWinnerIndex: 1,
    };

    const player0 = makePlayer(2, 2, [allianceEvent]);
    const player1 = makePlayer(3, 3, [allianceEvent]);
    const roundPlayers = [player0, player1];

    // Evaluated for loot player (Player 0)
    expect(scoreAlliance(0, player0, roundPlayers, 5)).toBe(20);
    // Evaluated for trick winner (Player 1)
    expect(scoreAlliance(1, player1, roundPlayers, 5)).toBe(20);
  });

  it("awards 0 bonus points when loot player misses bid", () => {
    const allianceEvent: RoundEvent = {
      type: "alliance",
      lootPlayerIndex: 0,
      trickWinnerIndex: 1,
    };

    const player0 = makePlayer(2, 1, [allianceEvent]); // Missed!
    const player1 = makePlayer(3, 3, [allianceEvent]); // Hit!
    const roundPlayers = [player0, player1];

    expect(scoreAlliance(0, player0, roundPlayers, 5)).toBe(0);
    expect(scoreAlliance(1, player1, roundPlayers, 5)).toBe(0);
  });

  it("awards 0 bonus points when trick winner misses bid", () => {
    const allianceEvent: RoundEvent = {
      type: "alliance",
      lootPlayerIndex: 0,
      trickWinnerIndex: 1,
    };

    const player0 = makePlayer(2, 2, [allianceEvent]); // Hit!
    const player1 = makePlayer(3, 4, [allianceEvent]); // Missed!
    const roundPlayers = [player0, player1];

    expect(scoreAlliance(0, player0, roundPlayers, 5)).toBe(0);
    expect(scoreAlliance(1, player1, roundPlayers, 5)).toBe(0);
  });

  it("awards 0 bonus points when both allied players miss bids", () => {
    const allianceEvent: RoundEvent = {
      type: "alliance",
      lootPlayerIndex: 0,
      trickWinnerIndex: 1,
    };

    const player0 = makePlayer(2, 1, [allianceEvent]); // Missed!
    const player1 = makePlayer(3, 4, [allianceEvent]); // Missed!
    const roundPlayers = [player0, player1];

    expect(scoreAlliance(0, player0, roundPlayers, 5)).toBe(0);
    expect(scoreAlliance(1, player1, roundPlayers, 5)).toBe(0);
  });

  it("awards 0 bonus points to a player not involved in the alliance", () => {
    const allianceEvent: RoundEvent = {
      type: "alliance",
      lootPlayerIndex: 0,
      trickWinnerIndex: 1,
    };

    const player0 = makePlayer(2, 2);
    const player1 = makePlayer(3, 3);
    const player2 = makePlayer(1, 1, [allianceEvent]); // Player 2 has the event somehow
    const roundPlayers = [player0, player1, player2];

    expect(scoreAlliance(2, player2, roundPlayers, 5)).toBe(0);
  });

  it("awards 0 bonus points when allied player is not in roundPlayers array", () => {
    const allianceEvent: RoundEvent = {
      type: "alliance",
      lootPlayerIndex: 0,
      trickWinnerIndex: 5, // Player 5 does not exist
    };

    const player0 = makePlayer(2, 2, [allianceEvent]);
    const roundPlayers = [player0];

    expect(scoreAlliance(0, player0, roundPlayers, 5)).toBe(0);
  });

  it("awards 0 bonus points when bids or won values are null", () => {
    const allianceEvent: RoundEvent = {
      type: "alliance",
      lootPlayerIndex: 0,
      trickWinnerIndex: 1,
    };

    const player0 = makePlayer(null, 2, [allianceEvent]);
    const player1 = makePlayer(3, 3, [allianceEvent]);
    expect(scoreAlliance(0, player0, [player0, player1], 5)).toBe(0);

    const player0WonNull = makePlayer(2, null, [allianceEvent]);
    expect(scoreAlliance(0, player0WonNull, [player0WonNull, player1], 5)).toBe(0);

    const player1BidNull = makePlayer(null, 3, [allianceEvent]);
    expect(scoreAlliance(0, player0, [player0, player1BidNull], 5)).toBe(0);
  });

  it("correctly evaluates alliance with Harry the Giant delta applied to bids", () => {
    const allianceEvent: RoundEvent = {
      type: "alliance",
      lootPlayerIndex: 0,
      trickWinnerIndex: 1,
    };

    // Player 0 base bid 1 + Harry delta 1 = effective bid 2, won 2 (Hit!)
    const player0 = makePlayer(1, 2, [allianceEvent], 1);
    // Player 1 base bid 4 + Harry delta -1 = effective bid 3, won 3 (Hit!)
    const player1 = makePlayer(4, 3, [allianceEvent], -1);
    const roundPlayers = [player0, player1];

    expect(scoreAlliance(0, player0, roundPlayers, 5)).toBe(20);
    expect(scoreAlliance(1, player1, roundPlayers, 5)).toBe(20);

    // If Player 0 won 1 instead of 2 (missed effective bid 2)
    const player0Missed = makePlayer(1, 1, [allianceEvent], 1);
    expect(scoreAlliance(0, player0Missed, [player0Missed, player1], 5)).toBe(0);
  });

  it("stacks bonus points (+40) for multiple successful alliance events", () => {
    const alliance1: RoundEvent = {
      type: "alliance",
      lootPlayerIndex: 0,
      trickWinnerIndex: 1,
    };
    const alliance2: RoundEvent = {
      type: "alliance",
      lootPlayerIndex: 0,
      trickWinnerIndex: 2,
    };

    const player0 = makePlayer(2, 2, [alliance1, alliance2]);
    const player1 = makePlayer(1, 1, [alliance1]);
    const player2 = makePlayer(0, 0, [alliance2]);
    const roundPlayers = [player0, player1, player2];

    expect(scoreAlliance(0, player0, roundPlayers, 5)).toBe(40);
  });

  it("ignores non-alliance events in the player's event list", () => {
    const player0 = makePlayer(2, 2, [
      { type: "fourteenBonus", playerIndex: 0, suit: "black" },
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "pirate",
        count: 1,
      },
    ]);
    expect(scoreAlliance(0, player0, [player0], 5)).toBe(0);
  });
});

describe("scoreRascal", () => {
  const makeRascalEvent = (
    ownerIndex: number,
    wager: 10 | 20,
  ): RoundEvent => ({
    type: "pirateAbility",
    ownerIndex,
    pirate: "rascal",
    wager,
  });

  it("awards +wager (+10 / +20) when player makes exact bid", () => {
    const event10 = makeRascalEvent(0, 10);
    expect(scoreRascal([event10], 0, 2, 2)).toBe(10);
    expect(scoreRascal([event10], 0, 0, 0)).toBe(10);

    const event20 = makeRascalEvent(0, 20);
    expect(scoreRascal([event20], 0, 3, 3)).toBe(20);
    expect(scoreRascal([event20], 0, 0, 0)).toBe(20);
  });

  it("penalizes -wager (-10 / -20) when player misses bid", () => {
    const event10 = makeRascalEvent(0, 10);
    expect(scoreRascal([event10], 0, 2, 3)).toBe(-10);
    expect(scoreRascal([event10], 0, 0, 1)).toBe(-10);

    const event20 = makeRascalEvent(0, 20);
    expect(scoreRascal([event20], 0, 3, 1)).toBe(-20);
    expect(scoreRascal([event20], 0, 2, 0)).toBe(-20);
  });

  it("returns 0 bonus/penalty when wager is 0", () => {
    const event0 = {
      type: "pirateAbility" as const,
      ownerIndex: 0,
      pirate: "rascal" as const,
      wager: 0 as unknown as 10 | 20,
    };
    expect(scoreRascal([event0], 0, 2, 2)).toBe(0);
    expect(scoreRascal([event0], 0, 2, 3)).toBe(0);
  });

  it("returns 0 if effectiveBid or won is null", () => {
    const event20 = makeRascalEvent(0, 20);
    expect(scoreRascal([event20], 0, null, 2)).toBe(0);
    expect(scoreRascal([event20], 0, 2, null)).toBe(0);
    expect(scoreRascal([event20], 0, null, null)).toBe(0);
  });

  it("returns 0 if ownerIndex does not match playerIndex", () => {
    const event20 = makeRascalEvent(1, 20); // Owned by player 1
    // Evaluated for player 0
    expect(scoreRascal([event20], 0, 2, 2)).toBe(0);
    expect(scoreRascal([event20], 0, 2, 3)).toBe(0);
  });

  it("ignores non-rascal pirate abilities and other event types", () => {
    const nonRascalEvent = {
      type: "pirateAbility" as const,
      ownerIndex: 0,
      pirate: "other" as unknown as "rascal",
      wager: 20 as const,
    };
    const fourteenEvent: RoundEvent = {
      type: "fourteenBonus",
      playerIndex: 0,
      suit: "black",
    };

    expect(scoreRascal([nonRascalEvent, fourteenEvent], 0, 2, 2)).toBe(0);
  });

  it("sums multiple rascal events for the same player", () => {
    const event1 = makeRascalEvent(0, 20);
    const event2 = makeRascalEvent(0, 10);
    expect(scoreRascal([event1, event2], 0, 2, 2)).toBe(30);
    expect(scoreRascal([event1, event2], 0, 2, 1)).toBe(-30);
  });
});

describe("previewActiveBonus", () => {
  it("calculates immediate 14 and capture bonuses while ignoring alliance and rascal", () => {
    const player: PlayerRoundData = {
      bid: 2,
      won: null,
      harryGiantBidDelta: null,
      score: 0,
      events: [
        { type: "fourteenBonus", playerIndex: 0, suit: "black" }, // 20
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "king",
          count: 2,
        }, // 60
        {
          type: "alliance",
          lootPlayerIndex: 0,
          trickWinnerIndex: 1,
        }, // Ignored in preview
        {
          type: "pirateAbility",
          ownerIndex: 0,
          pirate: "rascal",
          wager: 20,
        }, // Ignored in preview
      ],
    };

    expect(previewActiveBonus(player)).toBe(20 + 60);
  });

  it("returns 0 when player has no active bonus events", () => {
    const player: PlayerRoundData = {
      bid: null,
      won: null,
      harryGiantBidDelta: null,
      score: 0,
      events: [],
    };
    expect(previewActiveBonus(player)).toBe(0);
  });
});

describe("computeRoundScoreBreakdown", () => {
  it("computes complete round score with all bonus types when bid is made", () => {
    const events: RoundEvent[] = [
      { type: "fourteenBonus", playerIndex: 0, suit: "black" }, // +20
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "mermaid",
        count: 1,
      }, // +40
      {
        type: "alliance",
        lootPlayerIndex: 0,
        trickWinnerIndex: 1,
      }, // +20
      {
        type: "pirateAbility",
        ownerIndex: 0,
        pirate: "rascal",
        wager: 20,
      }, // +20
    ];

    const player0: PlayerRoundData = {
      bid: 2,
      won: 2,
      harryGiantBidDelta: null,
      events,
      score: 0,
    };
    const player1: PlayerRoundData = {
      bid: 3,
      won: 3,
      harryGiantBidDelta: null,
      events: [
        {
          type: "alliance",
          lootPlayerIndex: 0,
          trickWinnerIndex: 1,
        },
      ],
      score: 0,
    };

    const breakdown = computeRoundScoreBreakdown({
      handSize: 5,
      playerIndex: 0,
      player: player0,
      roundPlayers: [player0, player1],
    });

    expect(breakdown.main).toBe(40); // 20 * 2
    expect(breakdown.bonus).toBe(20 + 40 + 20 + 20); // 100
    expect(breakdown.total).toBe(140);
  });

  it("forfeits all bonuses when bid is missed", () => {
    const events: RoundEvent[] = [
      { type: "fourteenBonus", playerIndex: 0, suit: "black" },
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "mermaid",
        count: 1,
      },
      {
        type: "alliance",
        lootPlayerIndex: 0,
        trickWinnerIndex: 1,
      },
      {
        type: "pirateAbility",
        ownerIndex: 0,
        pirate: "rascal",
        wager: 20,
      },
    ];

    const player0: PlayerRoundData = {
      bid: 2,
      won: 3, // Missed by 1 trick!
      harryGiantBidDelta: null,
      events,
      score: 0,
    };
    const player1: PlayerRoundData = {
      bid: 3,
      won: 3,
      harryGiantBidDelta: null,
      events: [],
      score: 0,
    };

    const breakdown = computeRoundScoreBreakdown({
      handSize: 5,
      playerIndex: 0,
      player: player0,
      roundPlayers: [player0, player1],
    });

    expect(breakdown.main).toBe(-10); // -10 * |2 - 3|
    expect(breakdown.bonus).toBe(0);
    expect(breakdown.total).toBe(-10);
  });

  it("integrates Harry the Giant delta into effective bid scoring", () => {
    const player: PlayerRoundData = {
      bid: 2,
      won: 3,
      harryGiantBidDelta: 1, // Effective bid becomes 3
      events: [{ type: "fourteenBonus", playerIndex: 0, suit: "green" }], // +10
      score: 0,
    };

    const breakdown = computeRoundScoreBreakdown({
      handSize: 5,
      playerIndex: 0,
      player,
      roundPlayers: [player],
    });

    expect(breakdown.main).toBe(60); // 20 * 3
    expect(breakdown.bonus).toBe(10);
    expect(breakdown.total).toBe(70);
  });

  it("handles 0-bid with Harry the Giant delta", () => {
    const player: PlayerRoundData = {
      bid: 1,
      won: 0,
      harryGiantBidDelta: -1, // Effective bid becomes 0
      events: [],
      score: 0,
    };

    const breakdown = computeRoundScoreBreakdown({
      handSize: 4,
      playerIndex: 0,
      player,
      roundPlayers: [player],
    });

    expect(breakdown.main).toBe(40); // 10 * 4
    expect(breakdown.bonus).toBe(0);
    expect(breakdown.total).toBe(40);
  });

  it("handles incomplete rounds where bid or won is null", () => {
    const player: PlayerRoundData = {
      bid: null,
      won: null,
      harryGiantBidDelta: null,
      events: [{ type: "fourteenBonus", playerIndex: 0, suit: "black" }],
      score: 0,
    };

    const breakdown = computeRoundScoreBreakdown({
      handSize: 5,
      playerIndex: 0,
      player,
      roundPlayers: [player],
    });

    expect(breakdown.main).toBe(0);
    expect(breakdown.bonus).toBe(0);
    expect(breakdown.total).toBe(0);
  });
});

