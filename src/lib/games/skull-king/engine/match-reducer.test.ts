import { describe, expect, it } from "vitest";

import { createCard } from "@/lib/games/skull-king/engine/cards";
import { isLegalPlay } from "@/lib/games/skull-king/engine/legal-moves";
import {
  advanceRound,
  applyAbility,
  applyBid,
  applyPlayCard,
  confirmRound,
  createMatchState,
  defaultMatchConfig,
  reconcileMatchToSeatedPlayers,
  startMatch,
  startRound,
} from "@/lib/games/skull-king/engine/match-reducer";
import { createRoundState } from "@/lib/games/skull-king/engine/round";
import type { MatchState } from "@/lib/games/skull-king/engine/types";

function playNextLegalCard(
  state: MatchState,
  tigressMode: "pirate" | "escape" = "escape",
): MatchState {
  const round = state.currentRound;
  if (!round) throw new Error("No current round");
  const seated = state.config.playerCount;
  const turnPlayer =
    round.currentTrick.length === 0
      ? round.trickLeaderIndex
      : (round.currentTrick[round.currentTrick.length - 1]!.playerIndex + 1) %
        seated;
  const hand = round.hands[turnPlayer]!;
  const legalCard = hand.find((c) =>
    isLegalPlay(
      hand,
      round.currentTrick,
      c.id,
      c.def.kind === "tigress" ? tigressMode : undefined,
    ),
  );
  if (!legalCard) {
    throw new Error(`No legal card found for player ${turnPlayer}`);
  }
  const res = applyPlayCard(
    state,
    turnPlayer,
    legalCard.id,
    legalCard.def.kind === "tigress" ? tigressMode : undefined,
  );
  if ("error" in res) {
    throw new Error(`applyPlayCard failed: ${res.error}`);
  }
  return res;
}

function playFullTrick(
  state: MatchState,
  tigressMode: "pirate" | "escape" = "escape",
): MatchState {
  let current = state;
  const seated = current.config.playerCount;
  for (let i = 0; i < seated; i++) {
    current = playNextLegalCard(current, tigressMode);
  }
  return current;
}

describe("match-reducer", () => {
  it("starts match and round", () => {
    const config = defaultMatchConfig(3);
    let state = createMatchState("AB", "host", config);
    state = startMatch(state, 99);
    state = startRound(state, 42);
    expect(state.currentRound?.phase).toBe("bidding");
    expect(state.currentRound?.hands).toHaveLength(3);
  });

  it("plays through bids to playing", () => {
    const config = defaultMatchConfig(2);
    let state = createMatchState("CD", "host", config);
    state = startMatch(state, 1);
    state = startRound(state, 5);
    state = applyBid(state, 0, 1) as typeof state;
    state = applyBid(state, 1, 0) as typeof state;
    expect(state.currentRound?.phase).toBe("playing");
  });

  it("ends match after final round", () => {
    const config = { ...defaultMatchConfig(2), roundsSchema: [1] };
    let state = createMatchState("EF", "host", config);
    state = startMatch(state, 1);
    state = startRound(state, 10);
    state = applyBid(state, 0, 1) as typeof state;
    state = applyBid(state, 1, 0) as typeof state;

    const round = state.currentRound!;
    state = {
      ...state,
      currentRound: {
        ...round,
        tricksWon: [1, 0],
        completedTricks: round.completedTricks,
        phase: "scoring",
        roundScores: [20, 0],
        currentTrick: [],
      },
    };

    state = confirmRound(state);
    expect(state.phase).toBe("game_over");
    expect(state.winners).toBeDefined();
    expect(state.roundHistory).toHaveLength(1);
    expect(state.roundHistory[0]?.roundIndex).toBe(0);
  });

  it("advance_round confirms scoring and deals next hand", () => {
    const config = { ...defaultMatchConfig(2), roundsSchema: [1, 1] };
    let state = createMatchState("IJ", "host", config);
    state = startMatch(state, 1);
    state = startRound(state, 10);
    state = applyBid(state, 0, 1) as typeof state;
    state = applyBid(state, 1, 0) as typeof state;

    const round = state.currentRound!;
    state = {
      ...state,
      currentRound: {
        ...round,
        tricksWon: [1, 0],
        completedTricks: round.completedTricks,
        phase: "scoring",
        roundScores: [20, 0],
        currentTrick: [],
      },
    };

    state = advanceRound(state, 99);
    expect(state.roundHistory).toHaveLength(1);
    expect(state.currentRound?.phase).toBe("bidding");
    expect(state.currentRound?.roundIndex).toBe(1);
  });

  it("accumulates round history across multiple confirms", () => {
    const config = { ...defaultMatchConfig(2), roundsSchema: [1, 1, 1] };
    let state = createMatchState("KL", "host", config);
    state = startMatch(state, 1);

    for (let i = 0; i < 2; i++) {
      state = startRound(state, 10 + i);
      state = applyBid(state, 0, 1) as typeof state;
      state = applyBid(state, 1, 0) as typeof state;
      const round = state.currentRound!;
      state = {
        ...state,
        currentRound: {
          ...round,
          tricksWon: [1, 0],
          phase: "scoring",
          roundScores: [20, 0],
          currentTrick: [],
        },
      };
      state = confirmRound(state);
    }

    expect(state.roundHistory).toHaveLength(2);
    expect(state.roundHistory[0]?.roundIndex).toBe(0);
    expect(state.roundHistory[1]?.roundIndex).toBe(1);
  });

  it("3 seated with config 4 reconciles and enters playing after 3 bids", () => {
    const config = defaultMatchConfig(4);
    let state = createMatchState("GH", "host", config);
    state = {
      ...state,
      playerIds: ["host", "p2", "p3"],
      config: { ...config, playerNames: ["A", "B", "C", "D"] },
    };
    state = reconcileMatchToSeatedPlayers(state, 3);
    expect(state.config.playerCount).toBe(3);

    state = startMatch(state, 7);
    state = startRound(state, 8);
    expect(state.currentRound?.bids).toHaveLength(3);
    expect(state.currentRound?.hands).toHaveLength(3);

    state = applyBid(state, 0, 0) as typeof state;
    state = applyBid(state, 1, 1) as typeof state;
    state = applyBid(state, 2, 0) as typeof state;
    expect(state.currentRound?.phase).toBe("playing");
    expect(state.currentRound?.trickLeaderIndex).toBe(
      state.currentRound?.leaderIndex,
    );
  });
});

describe("authentic applyPlayCard game loop", () => {
  it("plays a 1-trick round step-by-step to scoring phase with completedTricks and tricksWon", () => {
    const config = defaultMatchConfig(3);
    let state = createMatchState("LOOP1", "host", config);
    state = startMatch(state, 42);
    state = startRound(state, 100);

    const leader = state.currentRound!.trickLeaderIndex;
    const p1 = (leader + 1) % 3;
    const p2 = (leader + 2) % 3;

    // Apply bids for all 3 players
    state = applyBid(state, 0, 1) as MatchState;
    state = applyBid(state, 1, 0) as MatchState;
    state = applyBid(state, 2, 0) as MatchState;
    expect(state.currentRound?.phase).toBe("playing");
    expect(state.currentRound?.completedTricks).toHaveLength(0);

    // Leader plays first card into trick
    const leaderCard = state.currentRound!.hands[leader]![0]!;
    const stateAfter1 = applyPlayCard(
      state,
      leader,
      leaderCard.id,
      leaderCard.def.kind === "tigress" ? "escape" : undefined,
    );
    expect("error" in stateAfter1).toBe(false);
    state = stateAfter1 as MatchState;

    expect(state.currentRound?.hands[leader]).toHaveLength(0);
    expect(state.currentRound?.currentTrick).toHaveLength(1);
    expect(state.currentRound?.currentTrick[0]?.playerIndex).toBe(leader);
    expect(state.currentRound?.currentTrick[0]?.card.id).toBe(leaderCard.id);
    expect(state.currentRound?.currentTrick[0]?.playOrder).toBe(0);
    expect(state.currentRound?.completedTricks).toHaveLength(0);
    expect(state.currentRound?.phase).toBe("playing");

    // Player 1 plays second card into trick
    const p1Hand = state.currentRound!.hands[p1]!;
    const p1Card = p1Hand.find((c) =>
      isLegalPlay(
        p1Hand,
        state.currentRound!.currentTrick,
        c.id,
        c.def.kind === "tigress" ? "escape" : undefined,
      ),
    )!;
    const stateAfter2 = applyPlayCard(
      state,
      p1,
      p1Card.id,
      p1Card.def.kind === "tigress" ? "escape" : undefined,
    );
    expect("error" in stateAfter2).toBe(false);
    state = stateAfter2 as MatchState;

    expect(state.currentRound?.hands[p1]).toHaveLength(0);
    expect(state.currentRound?.currentTrick).toHaveLength(2);
    expect(state.currentRound?.currentTrick[1]?.playerIndex).toBe(p1);
    expect(state.currentRound?.completedTricks).toHaveLength(0);
    expect(state.currentRound?.phase).toBe("playing");

    // Player 2 plays third card, completing the trick
    const p2Hand = state.currentRound!.hands[p2]!;
    const p2Card = p2Hand.find((c) =>
      isLegalPlay(
        p2Hand,
        state.currentRound!.currentTrick,
        c.id,
        c.def.kind === "tigress" ? "escape" : undefined,
      ),
    )!;
    const stateAfter3 = applyPlayCard(
      state,
      p2,
      p2Card.id,
      p2Card.def.kind === "tigress" ? "escape" : undefined,
    );
    expect("error" in stateAfter3).toBe(false);
    state = stateAfter3 as MatchState;

    // Verify trick resolution and transition to scoring
    expect(state.currentRound?.currentTrick).toHaveLength(0);
    expect(state.currentRound?.completedTricks).toHaveLength(1);
    const trickResult = state.currentRound!.completedTricks[0]!;
    expect(trickResult.outcome.type).toBe("won");
    if (trickResult.outcome.type === "won") {
      const winner = trickResult.outcome.winnerIndex;
      expect(state.currentRound?.tricksWon[winner]).toBe(1);
      expect(
        state.currentRound?.tricksWon.reduce((acc, val) => acc + val, 0),
      ).toBe(1);
    }
    expect(state.currentRound?.phase).toBe("scoring");
    expect(state.currentRound?.roundScores).not.toBeNull();
    expect(state.currentRound?.roundScores).toHaveLength(3);
  });

  it("plays multi-trick round authentically with leader advancement between tricks", () => {
    const config = { ...defaultMatchConfig(3), roundsSchema: [3] };
    let state = createMatchState("MULTI", "host", config);
    state = startMatch(state, 123);
    state = startRound(state, 456);

    // Hand size 3
    expect(state.currentRound?.handSize).toBe(3);
    expect(state.currentRound?.hands[0]).toHaveLength(3);
    expect(state.currentRound?.hands[1]).toHaveLength(3);
    expect(state.currentRound?.hands[2]).toHaveLength(3);

    // Place bids
    state = applyBid(state, 0, 1) as MatchState;
    state = applyBid(state, 1, 1) as MatchState;
    state = applyBid(state, 2, 1) as MatchState;
    expect(state.currentRound?.phase).toBe("playing");

    // --- Trick 1 ---
    state = playFullTrick(state);
    expect(state.currentRound?.completedTricks).toHaveLength(1);
    expect(state.currentRound?.currentTrick).toHaveLength(0);
    expect(state.currentRound?.phase).toBe("playing");

    const winner1 =
      state.currentRound!.completedTricks[0]!.outcome.type === "won"
        ? state.currentRound!.completedTricks[0]!.outcome.winnerIndex
        : state.currentRound!.completedTricks[0]!.outcome.wouldBeWinnerIndex;
    // Trick leader for next trick must be winner of trick 1
    expect(state.currentRound?.trickLeaderIndex).toBe(winner1);
    expect(state.currentRound?.hands[0]).toHaveLength(2);
    expect(state.currentRound?.hands[1]).toHaveLength(2);
    expect(state.currentRound?.hands[2]).toHaveLength(2);

    // --- Trick 2 ---
    state = playFullTrick(state);
    expect(state.currentRound?.completedTricks).toHaveLength(2);
    expect(state.currentRound?.phase).toBe("playing");

    const winner2 =
      state.currentRound!.completedTricks[1]!.outcome.type === "won"
        ? state.currentRound!.completedTricks[1]!.outcome.winnerIndex
        : state.currentRound!.completedTricks[1]!.outcome.wouldBeWinnerIndex;
    expect(state.currentRound?.trickLeaderIndex).toBe(winner2);
    expect(state.currentRound?.hands[0]).toHaveLength(1);
    expect(state.currentRound?.hands[1]).toHaveLength(1);
    expect(state.currentRound?.hands[2]).toHaveLength(1);

    // --- Trick 3 (Final Trick) ---
    state = playFullTrick(state);
    expect(state.currentRound?.completedTricks).toHaveLength(3);
    expect(state.currentRound?.currentTrick).toHaveLength(0);
    // Final trick completion automatically transitions phase to scoring
    expect(state.currentRound?.phase).toBe("scoring");
    expect(state.currentRound?.roundScores).not.toBeNull();
    expect(
      state.currentRound?.tricksWon.reduce((acc, val) => acc + val, 0),
    ).toBe(3);
  });

  it("runs full 2-round match authentically to game_over without manual state mutation", () => {
    const config = { ...defaultMatchConfig(3), roundsSchema: [1, 2] };
    let state = createMatchState("FULLMATCH", "host", config);
    state = startMatch(state, 77);

    // === Round 0 (1 card) ===
    state = startRound(state, 101);
    state = applyBid(state, 0, 1) as MatchState;
    state = applyBid(state, 1, 0) as MatchState;
    state = applyBid(state, 2, 0) as MatchState;
    state = playFullTrick(state);

    expect(state.currentRound?.phase).toBe("scoring");
    const round0Scores = state.currentRound!.roundScores!;
    state = confirmRound(state);

    expect(state.phase).toBe("in_progress");
    expect(state.currentRound).toBeNull();
    expect(state.roundHistory).toHaveLength(1);
    expect(state.roundHistory[0]?.roundIndex).toBe(0);
    expect(state.cumulativeScores).toEqual(round0Scores);

    // === Round 1 (2 cards) ===
    state = startRound(state, 202);
    expect(state.currentRound?.roundIndex).toBe(1);
    expect(state.currentRound?.handSize).toBe(2);
    expect(state.currentRound?.dealerIndex).toBeDefined();

    state = applyBid(state, 0, 1) as MatchState;
    state = applyBid(state, 1, 1) as MatchState;
    state = applyBid(state, 2, 0) as MatchState;

    state = playFullTrick(state);
    expect(state.currentRound?.phase).toBe("playing");
    expect(state.currentRound?.completedTricks).toHaveLength(1);

    state = playFullTrick(state);
    expect(state.currentRound?.phase).toBe("scoring");
    expect(state.currentRound?.completedTricks).toHaveLength(2);

    const round1Scores = state.currentRound!.roundScores!;
    state = confirmRound(state);

    // Game should be over after final round
    expect(state.phase).toBe("game_over");
    expect(state.winners).toBeDefined();
    expect(state.winners!.length).toBeGreaterThan(0);
    expect(state.roundHistory).toHaveLength(2);
    expect(state.cumulativeScores).toEqual([
      round0Scores[0]! + round1Scores[0]!,
      round0Scores[1]! + round1Scores[1]!,
      round0Scores[2]! + round1Scores[2]!,
    ]);
  });

  it("advanceRound automatically confirms scored round and deals next round after authentic card play", () => {
    const config = { ...defaultMatchConfig(2), roundsSchema: [1, 2] };
    let state = createMatchState("ADV", "host", config);
    state = startMatch(state, 33);
    state = startRound(state, 44);

    // Round 0
    state = applyBid(state, 0, 1) as MatchState;
    state = applyBid(state, 1, 0) as MatchState;
    state = playFullTrick(state);
    expect(state.currentRound?.phase).toBe("scoring");

    // advanceRound seamlessly transitions to Round 1
    state = advanceRound(state, 55);
    expect(state.roundHistory).toHaveLength(1);
    expect(state.currentRound?.roundIndex).toBe(1);
    expect(state.currentRound?.handSize).toBe(2);
    expect(state.currentRound?.phase).toBe("bidding");

    // Round 1
    state = applyBid(state, 0, 0) as MatchState;
    state = applyBid(state, 1, 2) as MatchState;
    state = playFullTrick(state);
    state = playFullTrick(state);
    expect(state.currentRound?.phase).toBe("scoring");

    // advanceRound on final round concludes match
    state = advanceRound(state, 66);
    expect(state.phase).toBe("game_over");
    expect(state.roundHistory).toHaveLength(2);
    expect(state.winners).toBeDefined();
  });

  it("rejects invalid playCard calls with descriptive errors", () => {
    const config = defaultMatchConfig(3);
    let state = createMatchState("ERR", "host", config);

    // 1. No round active
    const noRoundRes = applyPlayCard(state, 0, "green:5");
    expect(noRoundRes).toEqual({ error: "no_round" });

    state = startMatch(state, 1);
    state = startRound(state, 2);

    // 2. Still in bidding phase
    const notPlayingRes = applyPlayCard(state, 0, "green:5");
    expect(notPlayingRes).toEqual({ error: "not_playing" });

    // Submit bids
    state = applyBid(state, 0, 0) as MatchState;
    state = applyBid(state, 1, 0) as MatchState;
    state = applyBid(state, 2, 0) as MatchState;

    const leader = state.currentRound!.trickLeaderIndex;
    const nonLeader = (leader + 1) % 3;

    // 3. Not your turn
    const nonLeaderCard = state.currentRound!.hands[nonLeader]![0]!;
    const notTurnRes = applyPlayCard(state, nonLeader, nonLeaderCard.id);
    expect(notTurnRes).toEqual({ error: "not_your_turn" });

    // 4. Card not in hand / illegal card
    const notInHandRes = applyPlayCard(state, leader, "non_existent_card");
    expect(notInHandRes).toEqual({ error: "illegal_card" });
  });

  it("enforces suit following rules during authentic trick play", () => {
    const config = defaultMatchConfig(3);
    let state = createMatchState("SUIT", "host", config);
    state = startMatch(state, 1);

    // Construct deterministic hands:
    // Player 0 (Leader): Yellow 5
    // Player 1: Yellow 3, Purple 8 (holds lead suit yellow)
    // Player 2: Green 10
    const yellow5 = createCard({ kind: "suited", suit: "yellow", rank: 5 });
    const yellow3 = createCard({ kind: "suited", suit: "yellow", rank: 3 });
    const purple8 = createCard({ kind: "suited", suit: "purple", rank: 8 });
    const green10 = createCard({ kind: "suited", suit: "green", rank: 10 });

    const round = createRoundState({
      roundIndex: 0,
      handSize: 2,
      dealerIndex: 2, // leader will be leftOf(2, 3) = 0
      hands: [[yellow5], [yellow3, purple8], [green10]],
      undealt: [],
    });

    state = { ...state, currentRound: round };
    state = applyBid(state, 0, 1) as MatchState;
    state = applyBid(state, 1, 1) as MatchState;
    state = applyBid(state, 2, 0) as MatchState;

    // Player 0 leads Yellow 5
    state = applyPlayCard(state, 0, yellow5.id) as MatchState;
    expect(state.currentRound?.currentTrick).toHaveLength(1);

    // Player 1 attempts to play Purple 8 despite holding Yellow 3 -> ILLEGAL
    const illegalPlay = applyPlayCard(state, 1, purple8.id);
    expect(illegalPlay).toEqual({ error: "illegal_card" });

    // Player 1 follows suit with Yellow 3 -> LEGAL
    const legalPlay = applyPlayCard(state, 1, yellow3.id);
    expect("error" in legalPlay).toBe(false);
    state = legalPlay as MatchState;
    expect(state.currentRound?.currentTrick).toHaveLength(2);

    // Player 2 does not hold yellow, so green 10 is legal
    state = applyPlayCard(state, 2, green10.id) as MatchState;
    expect(state.currentRound?.completedTricks).toHaveLength(1);
    // Yellow 5 beats Yellow 3 and off-suit Green 10
    expect(state.currentRound?.completedTricks[0]?.outcome.winnerIndex).toBe(0);
  });

  it("supports Tigress played with mode pirate vs escape in authentic trick resolution", () => {
    const config = defaultMatchConfig(2);
    let state = createMatchState("TIGRESS", "host", config);
    state = startMatch(state, 1);

    const tigress = createCard({ kind: "tigress" });
    const yellow10 = createCard({ kind: "suited", suit: "yellow", rank: 10 });
    const purple2 = createCard({ kind: "suited", suit: "purple", rank: 2 });

    // --- Scenario A: Tigress as pirate ---
    const roundA = createRoundState({
      roundIndex: 0,
      handSize: 1,
      dealerIndex: 1, // leader is 0
      hands: [[tigress], [yellow10]],
      undealt: [],
    });

    state = { ...state, currentRound: roundA };
    state = applyBid(state, 0, 1) as MatchState;
    state = applyBid(state, 1, 0) as MatchState;

    // Playing Tigress without mode is illegal
    const noModeRes = applyPlayCard(state, 0, tigress.id);
    expect(noModeRes).toEqual({ error: "illegal_card" });

    // Playing Tigress as pirate beats yellow 10
    let pirateState = applyPlayCard(
      state,
      0,
      tigress.id,
      "pirate",
    ) as MatchState;
    pirateState = applyPlayCard(pirateState, 1, yellow10.id) as MatchState;
    expect(
      pirateState.currentRound?.completedTricks[0]?.outcome.winnerIndex,
    ).toBe(0);
    expect(pirateState.currentRound?.tricksWon).toEqual([1, 0]);

    // --- Scenario B: Tigress as escape ---
    const roundB = createRoundState({
      roundIndex: 0,
      handSize: 1,
      dealerIndex: 1,
      hands: [[tigress], [purple2]],
      undealt: [],
    });
    let escapeState = { ...state, currentRound: roundB };
    escapeState = applyBid(escapeState, 0, 0) as MatchState;
    escapeState = applyBid(escapeState, 1, 1) as MatchState;

    escapeState = applyPlayCard(
      escapeState,
      0,
      tigress.id,
      "escape",
    ) as MatchState;
    escapeState = applyPlayCard(escapeState, 1, purple2.id) as MatchState;
    expect(
      escapeState.currentRound?.completedTricks[0]?.outcome.winnerIndex,
    ).toBe(1);
    expect(escapeState.currentRound?.tricksWon).toEqual([0, 1]);
  });

  it("handles pirate abilities workflow via applyAbility before continuing next trick", () => {
    const config = {
      ...defaultMatchConfig(3),
      roundsSchema: [2],
      artifacts: {
        ...defaultMatchConfig(3).artifacts,
        pirateAbilities: true,
      },
    };
    let state = createMatchState("PIRATE", "host", config);
    state = startMatch(state, 1);

    const escape0 = createCard({ kind: "escape", index: 0 });
    const rosie = createCard({ kind: "pirate", pirate: "rosie" });
    const escape1 = createCard({ kind: "escape", index: 1 });
    const green2 = createCard({ kind: "suited", suit: "green", rank: 2 });
    const green3 = createCard({ kind: "suited", suit: "green", rank: 3 });
    const green4 = createCard({ kind: "suited", suit: "green", rank: 4 });

    const round = createRoundState({
      roundIndex: 0,
      handSize: 2,
      dealerIndex: 2, // leader is 0
      hands: [
        [escape0, green2],
        [rosie, green3],
        [escape1, green4],
      ],
      undealt: [],
    });

    state = { ...state, currentRound: round };
    state = applyBid(state, 0, 0) as MatchState;
    state = applyBid(state, 1, 1) as MatchState;
    state = applyBid(state, 2, 0) as MatchState;

    // Trick 1: P0 plays Escape, P1 plays Rosie, P2 plays Escape
    state = applyPlayCard(state, 0, escape0.id) as MatchState;
    state = applyPlayCard(state, 1, rosie.id) as MatchState;
    state = applyPlayCard(state, 2, escape1.id) as MatchState;

    // Rosie won trick 1 -> Ability pending
    expect(state.currentRound?.phase).toBe("ability");
    expect(state.currentRound?.pendingAbility?.pirate).toBe("rosie");
    expect(state.currentRound?.pendingAbility?.winnerIndex).toBe(1);

    // Card plays are blocked while in ability phase
    const blockedPlay = applyPlayCard(state, 1, green3.id);
    expect(blockedPlay).toEqual({ error: "not_playing" });

    // Resolve Rosie ability: choose Player 2 as next leader override
    const resolvedState = applyAbility(state, {
      type: "rosie",
      nextLeaderIndex: 2,
    });
    expect("error" in resolvedState).toBe(false);
    state = resolvedState as MatchState;

    // Round phase returns to playing with nextLeaderOverride set
    expect(state.currentRound?.phase).toBe("playing");
    expect(state.currentRound?.pendingAbility).toBeNull();
    expect(state.currentRound?.nextLeaderOverride).toBe(2);

    // Trick 2: Winner of trick 1 (Player 1) leads trick 2
    state = applyPlayCard(state, 1, green3.id) as MatchState;
    state = applyPlayCard(state, 2, green4.id) as MatchState;
    state = applyPlayCard(state, 0, green2.id) as MatchState;

    // Final trick complete -> phase transitions to scoring
    expect(state.currentRound?.phase).toBe("scoring");
    expect(state.currentRound?.completedTricks).toHaveLength(2);
  });

  it("handles Harry pirate ability on final trick transitioning automatically to scoring", () => {
    const config = {
      ...defaultMatchConfig(3),
      roundsSchema: [1],
      artifacts: {
        ...defaultMatchConfig(3).artifacts,
        pirateAbilities: true,
      },
    };
    let state = createMatchState("HARRY", "host", config);
    state = startMatch(state, 1);

    const escape0 = createCard({ kind: "escape", index: 0 });
    const harry = createCard({ kind: "pirate", pirate: "harry" });
    const escape1 = createCard({ kind: "escape", index: 1 });

    const round = createRoundState({
      roundIndex: 0,
      handSize: 1,
      dealerIndex: 2, // leader is 0
      hands: [[escape0], [harry], [escape1]],
      undealt: [],
    });

    state = { ...state, currentRound: round };
    // Player 1 bid 0, but will use Harry to bump effective bid to 1
    state = applyBid(state, 0, 0) as MatchState;
    state = applyBid(state, 1, 0) as MatchState;
    state = applyBid(state, 2, 0) as MatchState;

    state = applyPlayCard(state, 0, escape0.id) as MatchState;
    state = applyPlayCard(state, 1, harry.id) as MatchState;
    state = applyPlayCard(state, 2, escape1.id) as MatchState;

    expect(state.currentRound?.phase).toBe("ability");
    expect(state.currentRound?.pendingAbility?.pirate).toBe("harry");

    // Apply Harry ability delta +1
    const afterAbility = applyAbility(state, { type: "harry", delta: 1 });
    expect("error" in afterAbility).toBe(false);
    state = afterAbility as MatchState;

    // Harry ability on final trick automatically finalizes round scoring
    expect(state.currentRound?.phase).toBe("scoring");
    expect(state.currentRound?.bids[1]?.harryGiantDelta).toBe(1);
    expect(state.currentRound?.tricksWon[1]).toBe(1);
    // Player 1 bid 0 + 1 delta = 1 trick bid, 1 trick won -> scored 20 points
    expect(state.currentRound?.roundScores?.[1]).toBe(20);
  });
});

describe("rounds schema presets", () => {
  it("includes rulebook presets", async () => {
    const { ROUNDS_SCHEMA_PRESETS } = await import(
      "@/lib/games/skull-king/rounds-schema"
    );
    expect(ROUNDS_SCHEMA_PRESETS.whirlpool).toEqual([
      9, 9, 7, 7, 5, 5, 3, 3, 1, 1,
    ]);
    expect(ROUNDS_SCHEMA_PRESETS.evenKeeled).toEqual([2, 4, 6, 8, 10]);
  });
});
