import { describe, expect, it } from "vitest";

import {
  calculateHandBreakdown,
  calculateMermaidPoints,
  getOctopusPoints,
  getPenguinPoints,
  getSailorPoints,
  getShellPoints,
  resolveSeaSaltRound,
} from "../scoring";
import type { HandCounts } from "../types";

describe("Sea Salt & Paper — Scoring Engine", () => {
  describe("Collection scoring tables", () => {
    it("scores Shells correctly: 0, 0, 2, 4, 6, 9, 12", () => {
      expect(getShellPoints(0)).toBe(0);
      expect(getShellPoints(1)).toBe(0);
      expect(getShellPoints(2)).toBe(2);
      expect(getShellPoints(3)).toBe(4);
      expect(getShellPoints(4)).toBe(6);
      expect(getShellPoints(5)).toBe(9);
      expect(getShellPoints(6)).toBe(12);
      expect(getShellPoints(7)).toBe(12); // clamp
    });

    it("scores Octopuses correctly: 0, 0, 1, 3, 6, 9", () => {
      expect(getOctopusPoints(0)).toBe(0);
      expect(getOctopusPoints(1)).toBe(0);
      expect(getOctopusPoints(2)).toBe(1);
      expect(getOctopusPoints(3)).toBe(3);
      expect(getOctopusPoints(4)).toBe(6);
      expect(getOctopusPoints(5)).toBe(9);
      expect(getOctopusPoints(6)).toBe(9); // clamp
    });

    it("scores Penguins correctly: 0, 1, 3, 5", () => {
      expect(getPenguinPoints(0)).toBe(0);
      expect(getPenguinPoints(1)).toBe(1);
      expect(getPenguinPoints(2)).toBe(3);
      expect(getPenguinPoints(3)).toBe(5);
    });

    it("scores Sailors correctly: 0, 0, 5", () => {
      expect(getSailorPoints(0)).toBe(0);
      expect(getSailorPoints(1)).toBe(0);
      expect(getSailorPoints(2)).toBe(5);
    });
  });

  describe("Mermaid points calculation", () => {
    it("returns 0 points when 0 mermaids", () => {
      const res = calculateMermaidPoints(0, [4, 2, 1]);
      expect(res.points).toBe(0);
      expect(res.isInstantWin).toBe(false);
    });

    it("scores 1st mermaid from highest color count", () => {
      const res = calculateMermaidPoints(1, [5, 3, 1]);
      expect(res.points).toBe(5);
      expect(res.isInstantWin).toBe(false);
    });

    it("scores 2 mermaids by adding 1st and 2nd highest colors", () => {
      const res = calculateMermaidPoints(2, [5, 3, 1]);
      expect(res.points).toBe(8); // 5 + 3
      expect(res.isInstantWin).toBe(false);
    });

    it("scores 3 mermaids by adding top 3 colors", () => {
      const res = calculateMermaidPoints(3, [5, 3, 2, 1]);
      expect(res.points).toBe(10); // 5 + 3 + 2
      expect(res.isInstantWin).toBe(false);
    });

    it("triggers instant win on 4 mermaids", () => {
      const res = calculateMermaidPoints(4, [2, 2, 2]);
      expect(res.isInstantWin).toBe(true);
    });
  });

  describe("Single hand breakdown", () => {
    it("evaluates duo pairs and multipliers correctly", () => {
      const counts: HandCounts = {
        crabPairs: 1, // 1 pt
        boatPairs: 2, // 2 pts (4 boat cards)
        fishPairs: 1, // 1 pt (2 fish cards)
        swimmerSharkPairs: 0,
        shells: 3, // 4 pts
        octopuses: 2, // 1 pt
        penguins: 1, // 1 pt
        sailors: 0,
        lighthouse: 1, // +1 per boat card = 4 pts
        shoalOfFish: 1, // +1 per fish card = 2 pts
        penguinColony: 0,
        captain: 0,
        mermaids: 1,
        highestColorCount: 4, // 4 pts
      };

      const breakdown = calculateHandBreakdown(counts);

      // Duos: 1 + 2 + 1 = 4
      expect(breakdown.duoPoints).toBe(4);
      // Collections: shells(4) + octopuses(1) + penguins(1) = 6
      expect(breakdown.shellPoints).toBe(4);
      expect(breakdown.octopusPoints).toBe(1);
      expect(breakdown.penguinPoints).toBe(1);
      // Multipliers: lighthouse(4) + fish(2) = 6
      expect(breakdown.multiplierPoints).toBe(6);
      // Mermaid: 4
      expect(breakdown.mermaidPoints).toBe(4);
      // Total: 4 + 6 + 6 + 4 = 20
      expect(breakdown.rawTotal).toBe(20);
      expect(breakdown.hasFourMermaids).toBe(false);
    });
  });

  describe("Round Resolution (Stop vs Last Chance)", () => {
    it("resolves normal Stop declaration where everyone gets raw total", () => {
      const round = resolveSeaSaltRound(1, [
        {
          playerId: "p1",
          playerName: "Alice",
          declaration: "stop",
          counts: {
            crabPairs: 2, // 2
            boatPairs: 0,
            fishPairs: 0,
            swimmerSharkPairs: 0,
            shells: 4, // 6
            octopuses: 0,
            penguins: 0,
            sailors: 0,
            lighthouse: 0,
            shoalOfFish: 0,
            penguinColony: 0,
            captain: 0,
            mermaids: 0,
          },
        },
        {
          playerId: "p2",
          playerName: "Bob",
          declaration: "none",
          counts: {
            crabPairs: 0,
            boatPairs: 1, // 1
            fishPairs: 0,
            swimmerSharkPairs: 0,
            shells: 2, // 2
            octopuses: 2, // 1
            penguins: 0,
            sailors: 0,
            lighthouse: 0,
            shoalOfFish: 0,
            penguinColony: 0,
            captain: 0,
            mermaids: 0,
          },
        },
      ]);

      expect(round.playerResults[0]?.finalRoundScore).toBe(8); // 2 + 6
      expect(round.playerResults[1]?.finalRoundScore).toBe(4); // 1 + 2 + 1
    });

    it("resolves Last Chance when declarer wins strictly", () => {
      const round = resolveSeaSaltRound(1, [
        {
          playerId: "p1",
          playerName: "Alice",
          declaration: "last_chance",
          colorBonus: 3,
          counts: {
            crabPairs: 1, // 1
            boatPairs: 0,
            fishPairs: 0,
            swimmerSharkPairs: 0,
            shells: 5, // 9
            octopuses: 0,
            penguins: 0,
            sailors: 0,
            lighthouse: 0,
            shoalOfFish: 0,
            penguinColony: 0,
            captain: 0,
            mermaids: 0,
          }, // rawTotal = 10
        },
        {
          playerId: "p2",
          playerName: "Bob",
          declaration: "none",
          colorBonus: 4,
          counts: {
            crabPairs: 0,
            boatPairs: 0,
            fishPairs: 0,
            swimmerSharkPairs: 0,
            shells: 3, // 4
            octopuses: 3, // 3
            penguins: 0,
            sailors: 0,
            lighthouse: 0,
            shoalOfFish: 0,
            penguinColony: 0,
            captain: 0,
            mermaids: 0,
          }, // rawTotal = 7
        },
      ]);

      const alice = round.playerResults.find((p) => p.playerId === "p1")!;
      const bob = round.playerResults.find((p) => p.playerId === "p2")!;

      expect(alice.wonLastChance).toBe(true);
      // Alice gets raw total 10 + colorBonus 3 = 13
      expect(alice.finalRoundScore).toBe(13);
      // Bob only gets color bonus 4 (loses his hand score 7)
      expect(bob.finalRoundScore).toBe(4);
    });

    it("resolves Last Chance when opponent ties or beats declarer (failed bet)", () => {
      const round = resolveSeaSaltRound(1, [
        {
          playerId: "p1",
          playerName: "Alice",
          declaration: "last_chance",
          colorBonus: 3,
          counts: {
            crabPairs: 1, // 1
            boatPairs: 0,
            fishPairs: 0,
            swimmerSharkPairs: 0,
            shells: 4, // 6
            octopuses: 0,
            penguins: 0,
            sailors: 0,
            lighthouse: 0,
            shoalOfFish: 0,
            penguinColony: 0,
            captain: 0,
            mermaids: 0,
          }, // rawTotal = 7
        },
        {
          playerId: "p2",
          playerName: "Bob",
          declaration: "none",
          colorBonus: 2,
          counts: {
            crabPairs: 0,
            boatPairs: 0,
            fishPairs: 0,
            swimmerSharkPairs: 0,
            shells: 4, // 6
            octopuses: 2, // 1
            penguins: 0,
            sailors: 0,
            lighthouse: 0,
            shoalOfFish: 0,
            penguinColony: 0,
            captain: 0,
            mermaids: 0,
          }, // rawTotal = 7 (Tied!)
        },
      ]);

      const alice = round.playerResults.find((p) => p.playerId === "p1")!;
      const bob = round.playerResults.find((p) => p.playerId === "p2")!;

      expect(alice.wonLastChance).toBe(false);
      // Alice failed: only gets colorBonus 3
      expect(alice.finalRoundScore).toBe(3);
      // Bob gets his full hand raw total 7
      expect(bob.finalRoundScore).toBe(7);
    });

    it("triggers instant winner when a player has 4 mermaids", () => {
      const round = resolveSeaSaltRound(2, [
        {
          playerId: "p1",
          playerName: "Alice",
          declaration: "none",
          counts: {
            crabPairs: 0,
            boatPairs: 0,
            fishPairs: 0,
            swimmerSharkPairs: 0,
            shells: 0,
            octopuses: 0,
            penguins: 0,
            sailors: 0,
            lighthouse: 0,
            shoalOfFish: 0,
            penguinColony: 0,
            captain: 0,
            mermaids: 4,
          },
        },
        {
          playerId: "p2",
          playerName: "Bob",
          declaration: "none",
          counts: {
            crabPairs: 1,
            boatPairs: 0,
            fishPairs: 0,
            swimmerSharkPairs: 0,
            shells: 2,
            octopuses: 0,
            penguins: 0,
            sailors: 0,
            lighthouse: 0,
            shoalOfFish: 0,
            penguinColony: 0,
            captain: 0,
            mermaids: 0,
          },
        },
      ]);

      expect(round.winnerPlayerId).toBe("p1");
    });
  });
});
