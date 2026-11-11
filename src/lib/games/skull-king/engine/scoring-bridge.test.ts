import { describe, expect, it } from "vitest";
import { createCard } from "@/lib/games/skull-king/engine/cards";
import { defaultMatchConfig } from "@/lib/games/skull-king/engine/match-reducer";
import {
  createRoundState,
  nextRoundDealer,
  submitBidOnRound,
} from "@/lib/games/skull-king/engine/round";
import {
  buildPlayerRoundResults,
  buildRoundEventsFromTricks,
  scoreRoundFromState,
} from "@/lib/games/skull-king/engine/scoring-bridge";
import {
  createPlayedCard,
  resolveTrick,
} from "@/lib/games/skull-king/engine/trick-resolution";
import type { TrickResult } from "@/lib/games/skull-king/engine/types";

describe("scoring-bridge", () => {
  it("awards 14 bonus to trick winner on correct bid", () => {
    const y14 = createCard({ kind: "suited", suit: "yellow", rank: 14 });
    const g5 = createCard({ kind: "suited", suit: "green", rank: 5 });
    const trick = resolveTrick(
      [createPlayedCard(y14, 0, 0), createPlayedCard(g5, 1, 1)],
      2,
    );
    const events = buildRoundEventsFromTricks([trick], 2, {
      fourteenBonus: true,
      characterCapture: true,
      loot: false,
    });
    expect(events[0]?.some((e) => e.type === "fourteenBonus")).toBe(true);
  });

  it("awards 90 bonus when Skull King takes 3 pirates on made bid", () => {
    const p1 = createCard({ kind: "pirate", pirate: "rosie" });
    const p2 = createCard({ kind: "pirate", pirate: "bendt" });
    const p3 = createCard({ kind: "pirate", pirate: "rascal" });
    const king = createCard({ kind: "skull_king" });
    const trick = resolveTrick(
      [
        createPlayedCard(p1, 0, 0),
        createPlayedCard(p2, 1, 1),
        createPlayedCard(p3, 2, 2),
        createPlayedCard(king, 3, 3),
      ],
      4,
    );
    const round = createRoundState({
      roundIndex: 3,
      handSize: 4,
      dealerIndex: 0,
      hands: [[], [], [], []],
      undealt: [],
    });
    let r = submitBidOnRound(round, 3, 1);
    if ("error" in r) throw new Error(r.error);
    r = {
      ...r,
      tricksWon: [0, 0, 0, 1],
      phase: "scoring",
      completedTricks: [trick],
    };
    const results = buildPlayerRoundResults(r, {
      ...defaultMatchConfig(4),
      artifacts: {
        ...defaultMatchConfig(4).artifacts,
        characterCapture: true,
      },
    });
    expect(results[3]?.bonus).toBe(90);
    expect(results[3]?.main).toBe(20);
    expect(results[3]?.total).toBe(110);
  });

  it("awards 40 bonus when Pirate takes 2 mermaids on made bid", () => {
    const m1 = createCard({ kind: "mermaid", mermaid: "sirena" });
    const m2 = createCard({ kind: "mermaid", mermaid: "alyra" });
    const pirate = createCard({ kind: "pirate", pirate: "rosie" });
    const trick = resolveTrick(
      [
        createPlayedCard(m1, 0, 0),
        createPlayedCard(m2, 1, 1),
        createPlayedCard(pirate, 2, 2),
      ],
      3,
    );
    const round = createRoundState({
      roundIndex: 2,
      handSize: 3,
      dealerIndex: 0,
      hands: [[], [], []],
      undealt: [],
    });
    let r = submitBidOnRound(round, 2, 1);
    if ("error" in r) throw new Error(r.error);
    r = {
      ...r,
      tricksWon: [0, 0, 1],
      phase: "scoring",
      completedTricks: [trick],
    };
    const results = buildPlayerRoundResults(r, {
      ...defaultMatchConfig(3),
      artifacts: {
        ...defaultMatchConfig(3).artifacts,
        characterCapture: true,
      },
    });
    expect(results[2]?.bonus).toBe(40);
    expect(results[2]?.main).toBe(20);
    expect(results[2]?.total).toBe(60);
  });

  it("scores round with bid match", () => {
    const config = defaultMatchConfig(2);
    const round = createRoundState({
      roundIndex: 6,
      handSize: 7,
      dealerIndex: 0,
      hands: [[], []],
      undealt: [],
    });
    let r = submitBidOnRound(round, 0, 2);
    if ("error" in r) throw new Error(r.error);
    r = submitBidOnRound(r, 1, 1);
    if ("error" in r) throw new Error(r.error);
    r = { ...r, tricksWon: [2, 1], phase: "scoring", completedTricks: [] };
    const scores = scoreRoundFromState(r, config.artifacts);
    expect(scores[0]).toBe(40);
    expect(scores[1]).toBe(20);
  });

  it("forfeits bonus on missed bid in full round score", () => {
    const config = {
      ...defaultMatchConfig(1),
      artifacts: { ...defaultMatchConfig(1).artifacts, fourteenBonus: true },
    };
    const y14 = createCard({ kind: "suited", suit: "yellow", rank: 14 });
    const trick: TrickResult = resolveTrick([createPlayedCard(y14, 0, 0)], 1);
    const round = createRoundState({
      roundIndex: 0,
      handSize: 1,
      dealerIndex: 0,
      hands: [[]],
      undealt: [],
    });
    let r = submitBidOnRound(round, 0, 0);
    if ("error" in r) throw new Error(r.error);
    r = {
      ...r,
      tricksWon: [1],
      completedTricks: [trick],
      phase: "scoring" as const,
    };
    const scores = scoreRoundFromState(r, config.artifacts);
    expect(scores[0]).toBe(-10);
  });

  it("buildPlayerRoundResults exposes main and bonus breakdown", () => {
    const config = defaultMatchConfig(2);
    const round = createRoundState({
      roundIndex: 6,
      handSize: 7,
      dealerIndex: 0,
      hands: [[], []],
      undealt: [],
    });
    let r = submitBidOnRound(round, 0, 2);
    if ("error" in r) throw new Error(r.error);
    r = submitBidOnRound(r, 1, 1);
    if ("error" in r) throw new Error(r.error);
    r = {
      ...r,
      tricksWon: [2, 1],
      phase: "scoring",
      completedTricks: [],
      roundScores: [40, 20],
    };

    const results = buildPlayerRoundResults(r, config);
    expect(results[0]?.madeBid).toBe(true);
    expect(results[0]?.main).toBe(40);
    expect(results[0]?.total).toBe(40);
    expect(results[1]?.madeBid).toBe(true);
    expect(results[1]?.total).toBe(20);
  });
});

describe("round dealer rotation", () => {
  it("next dealer is first trick leader", () => {
    const round = createRoundState({
      roundIndex: 0,
      handSize: 3,
      dealerIndex: 2,
      hands: [[], [], []],
      undealt: [],
    });
    expect(round.leaderIndex).toBe(0);
    expect(nextRoundDealer(round)).toBe(0);
  });
});
