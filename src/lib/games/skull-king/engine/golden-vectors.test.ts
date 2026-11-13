import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveLeadContext } from "@/lib/games/skull-king/engine/lead-suit";
import { getLegalCards } from "@/lib/games/skull-king/engine/legal-moves";
import { resolveTrick } from "@/lib/games/skull-king/engine/trick-resolution";
import { computeRoundScoreBreakdown } from "@/lib/games/skull-king/round-score/score-rules";

const TESTDATA_DIR = path.resolve(
  __dirname,
  "../../../../../testdata/skull-king",
);

describe("Golden test vectors verification", () => {
  it("verifies all trick resolution golden vectors (>= 200 cases)", () => {
    const raw = fs.readFileSync(path.join(TESTDATA_DIR, "tricks.json"), "utf8");
    const cases = JSON.parse(raw);
    expect(cases.length).toBeGreaterThanOrEqual(200);

    for (const c of cases) {
      const leadCtx = resolveLeadContext(c.plays, c.ruleFlags);
      expect(leadCtx.leadSuit, `${c.id} (${c.name}) leadSuit`).toBe(
        c.expected.leadSuit,
      );

      const result = resolveTrick(c.plays, c.playerCount, c.ruleFlags);
      expect(result.outcome.type, `${c.id} (${c.name}) outcome.type`).toBe(
        c.expected.outcome.type,
      );

      if (result.outcome.type === "won") {
        expect(result.outcome.winnerIndex, `${c.id} winnerIndex`).toBe(
          c.expected.outcome.winnerIndex,
        );
      } else {
        expect(
          result.outcome.wouldBeWinnerIndex,
          `${c.id} wouldBeWinnerIndex`,
        ).toBe(c.expected.outcome.wouldBeWinnerIndex);
      }

      expect(result.captures, `${c.id} captures`).toEqual(c.expected.captures);
      expect(result.lootAlliances ?? [], `${c.id} lootAlliances`).toEqual(
        c.expected.lootAlliances,
      );
    }
  });

  it("verifies all legal moves golden vectors", () => {
    const raw = fs.readFileSync(
      path.join(TESTDATA_DIR, "legal_moves.json"),
      "utf8",
    );
    const cases = JSON.parse(raw);
    expect(cases.length).toBeGreaterThan(0);

    for (const c of cases) {
      const legal = getLegalCards(c.hand, c.trick, c.ruleFlags);
      const ids = legal.map((card) => card.id);
      expect(ids, `${c.id} (${c.name}) legal moves`).toEqual(
        c.expectedLegalCardIds,
      );
    }
  });

  it("verifies all scoring golden vectors", () => {
    const raw = fs.readFileSync(
      path.join(TESTDATA_DIR, "scoring.json"),
      "utf8",
    );
    const cases = JSON.parse(raw);
    expect(cases.length).toBeGreaterThan(0);

    for (const c of cases) {
      const breakdown = computeRoundScoreBreakdown({
        handSize: c.handSize,
        playerIndex: c.playerIndex,
        player: c.player,
        roundPlayers: c.roundPlayers,
        scoringSystem: c.scoringSystem,
      });

      expect(breakdown.main, `${c.id} (${c.name}) main`).toBe(c.expected.main);
      expect(breakdown.bonus, `${c.id} (${c.name}) bonus`).toBe(
        c.expected.bonus,
      );
      expect(breakdown.total, `${c.id} (${c.name}) total`).toBe(
        c.expected.total,
      );
    }
  });
});
