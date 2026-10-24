import { describe, expect, it } from "vitest";
import { calculateInstantScore, calculateRoundScores } from "../scoring";
import type { ScoutRoundState } from "../types";

describe("Scout Scoring Engine", () => {
  it("calculates instant tableside score correctly", () => {
    // 6 collected cards (+6), 2 scout chips (+2), 3 cards in hand (-3) -> total 5
    expect(calculateInstantScore(6, 2, 3, false)).toBe(5);

    // Negative total is possible when penalty exceeds gains
    // 1 collected card (+1), 0 scout chips (+0), 5 cards in hand (-5) -> total -4
    expect(calculateInstantScore(1, 0, 5, false)).toBe(-4);

    // Exempt owner (round ended by table cleared back to owner): no hand penalty!
    expect(calculateInstantScore(4, 3, 5, true)).toBe(7);
  });

  it("calculates full round score breakdown with exempt owner exception", () => {
    const mockState: ScoutRoundState = {
      playerCount: 3,
      playerNames: ["Alice", "Bob", "Charlie"],
      hands: [
        {
          seatIndex: 0,
          cards: [{ id: "c1", top: 1, bottom: 2, isTopActive: true }],
          hasScoutAndShowAvailable: true,
          scorePileCount: 8,
          scoutChips: 2,
        },
        {
          seatIndex: 1,
          cards: [
            { id: "c2", top: 3, bottom: 4, isTopActive: true },
            { id: "c3", top: 5, bottom: 6, isTopActive: true },
          ],
          hasScoutAndShowAvailable: false,
          scorePileCount: 2,
          scoutChips: 1,
        },
        {
          seatIndex: 2,
          cards: [],
          hasScoutAndShowAvailable: true,
          scorePileCount: 4,
          scoutChips: 0,
        },
      ],
      activeSet: {
        combination: {
          type: "single",
          cards: [{ id: "c0", top: 9, bottom: 10, isTopActive: true }],
          value: 9,
          secondaryValue: 9,
        },
        ownerSeatIndex: 0,
      },
      currentTurnSeat: 0,
      dealerSeatIndex: 0,
      phase: "round_over",
      roundEndReason: "table_cleared", // Alice's set cleared table
      winningSeatIndex: 0,
      roundScores: null,
      history: [],
    };

    const breakdowns = calculateRoundScores(mockState);
    expect(breakdowns).toHaveLength(3);

    // Alice is exempt owner: 8 cards + 2 chips - 0 penalty = 10
    expect(breakdowns[0]?.totalRoundScore).toBe(10);
    expect(breakdowns[0]?.handPenalty).toBe(0);

    // Bob: 2 cards + 1 chip - 2 penalty = 1
    expect(breakdowns[1]?.totalRoundScore).toBe(1);
    expect(breakdowns[1]?.handPenalty).toBe(2);

    // Charlie: 4 cards + 0 chips - 0 penalty = 4
    expect(breakdowns[2]?.totalRoundScore).toBe(4);
    expect(breakdowns[2]?.handPenalty).toBe(0);
  });
});
