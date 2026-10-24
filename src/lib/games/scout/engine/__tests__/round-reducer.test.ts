import { describe, expect, it } from "vitest";
import { createScoutCard } from "../deck";
import { applyScoutAction, createScoutRound } from "../round-reducer";
import type { ScoutCard, ScoutRoundState } from "../types";

describe("Scout Round Reducer Engine", () => {
  it("initializes a clean scout round", () => {
    const round = createScoutRound(3, ["Alice", "Bob", "Charlie"]);
    expect(round.playerCount).toBe(3);
    expect(round.hands).toHaveLength(3);
    expect(round.phase).toBe("active");
    expect(round.currentTurnSeat).toBe(0);
    expect(round.activeSet).toBeNull();
  });

  it("handles SHOW action on empty table and advances turn", () => {
    const card1 = createScoutCard(3, 8, true);
    const card2 = createScoutCard(4, 9, true);

    const round = createScoutRound(2, ["Alice", "Bob"]);
    round.hands[0]!.cards = [card1, card2];

    // Alice plays run 3-4 (indices [0, 1])
    const res = applyScoutAction(round, {
      type: "SHOW",
      seatIndex: 0,
      cardIndices: [0, 1],
    });

    expect("error" in res).toBe(false);
    const state = res as ScoutRoundState;
    expect(state.activeSet).not.toBeNull();
    expect(state.activeSet?.combination.type).toBe("run");
    expect(state.activeSet?.ownerSeatIndex).toBe(0);
    expect(state.hands[0]?.cards).toHaveLength(0); // Alice emptied hand!
    expect(state.phase).toBe("round_over"); // Round ends when hand is empty
    expect(state.roundEndReason).toBe("empty_hand");
  });

  it("rejects SHOW action if combination is weaker than active set", () => {
    const highPair = [createScoutCard(8, 1, true), createScoutCard(8, 2, true)];
    const lowPair = [createScoutCard(5, 1, true), createScoutCard(5, 2, true)];

    const round = createScoutRound(2, ["Alice", "Bob"]);
    round.hands[0]!.cards = [...highPair, createScoutCard(1, 2, true)];
    round.hands[1]!.cards = [...lowPair, createScoutCard(3, 4, true)];

    // Alice plays pair of 8s
    const state1 = applyScoutAction(round, {
      type: "SHOW",
      seatIndex: 0,
      cardIndices: [0, 1],
    }) as ScoutRoundState;

    // Bob attempts to play pair of 5s -> should fail (weaker)
    const failRes = applyScoutAction(state1, {
      type: "SHOW",
      seatIndex: 1,
      cardIndices: [0, 1],
    });

    expect("error" in failRes).toBe(true);
    if ("error" in failRes) {
      expect(failRes.error).toBe("combination_not_strong_enough");
    }
  });

  it("handles SCOUT action and awards chip to active set owner", () => {
    const round = createScoutRound(3, ["Alice", "Bob", "Charlie"]);
    const aliceCards = [
      createScoutCard(7, 1, true),
      createScoutCard(7, 2, true),
      createScoutCard(1, 2, true),
    ];
    const bobCards = [createScoutCard(3, 4, true), createScoutCard(5, 6, true)];

    round.hands[0]!.cards = aliceCards;
    round.hands[1]!.cards = bobCards;

    // Alice shows pair of 7s
    const state1 = applyScoutAction(round, {
      type: "SHOW",
      seatIndex: 0,
      cardIndices: [0, 1],
    }) as ScoutRoundState;

    expect(state1.currentTurnSeat).toBe(1);

    // Bob scouts left card from table and inserts at index 1
    const scoutRes = applyScoutAction(state1, {
      type: "SCOUT",
      seatIndex: 1,
      takeFrom: "left",
      insertAtIndex: 1,
      useTop: true,
    });

    expect("error" in scoutRes).toBe(false);
    const state2 = scoutRes as ScoutRoundState;

    // Bob now has 3 cards
    expect(state2.hands[1]?.cards).toHaveLength(3);
    // Alice earned 1 scout chip
    expect(state2.hands[0]?.scoutChips).toBe(1);
    // Active set on table now only has 1 card left
    expect(state2.activeSet?.combination.cards).toHaveLength(1);
    // Turn advanced to Charlie (seat 2)
    expect(state2.currentTurnSeat).toBe(2);
  });
});
