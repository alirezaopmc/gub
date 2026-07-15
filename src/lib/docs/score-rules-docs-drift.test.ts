import { describe, expect, it } from "vitest"

import { loadDoc } from "@/lib/docs/load-doc"
import { listDocsBySource, sourceFileExists } from "@/lib/docs/list-docs-by-source"
import {
  BID_WON_FIXTURES,
  BID_WON_QUICK_REF_FIXTURES,
  ROUND_BREAKDOWN_FIXTURES,
  SCORE_RULES_SOURCE,
  SCORING_BONUS_DOC_SNIPPETS,
  SCORING_BONUS_RATES,
  SCORING_DOC_PATHS,
  SCORING_FORMULA_SNIPPETS,
  SHARED_DOC_SNIPPETS,
} from "@/lib/docs/scoring-doc-fixtures"
import {
  computeRoundScoreBreakdown,
  scoreAlliance,
  scoreBidWon,
  scoreFourteenBonus,
  scoreHeroCaptures,
  scoreRascal,
} from "@/lib/games/skull-king/round-score/score-rules"
import type { PlayerRoundData } from "@/lib/games/skull-king/round-score/types"

function loadScoringDocContents(): Map<string, string> {
  const map = new Map<string, string>()
  for (const relativePath of SCORING_DOC_PATHS) {
    map.set(relativePath, loadDoc(relativePath).content)
  }
  return map
}

function assertSnippetInDoc(
  relativePath: string,
  content: string,
  snippet: string,
  context: string,
): void {
  expect(content, `${relativePath} missing "${snippet}" (${context})`).toContain(snippet)
}

function assertSnippetInAllDocs(
  docs: Map<string, string>,
  snippet: string,
  context: string,
): void {
  for (const [relativePath, content] of docs) {
    assertSnippetInDoc(relativePath, content, snippet, context)
  }
}

describe("score-rules docs drift", () => {
  const docs = loadScoringDocContents()
  const quickRefPath = "games/skull-king/reference/scoring-quick-ref.md"
  const quickRefContent = docs.get(quickRefPath) ?? ""

  it("discovers exactly two docs linked to score-rules.ts", () => {
    const paths = listDocsBySource(SCORE_RULES_SOURCE)
    expect(paths.sort()).toEqual([...SCORING_DOC_PATHS].sort())
  })

  it("score-rules.ts exists on disk", () => {
    expect(sourceFileExists(SCORE_RULES_SOURCE)).toBe(true)
  })

  it("bid/won fixtures match scoreBidWon", () => {
    for (const fixture of [...BID_WON_FIXTURES, ...BID_WON_QUICK_REF_FIXTURES]) {
      const actual = scoreBidWon(fixture.handSize, fixture.bid, fixture.won)
      expect(actual, fixture.label).toBe(fixture.expected)
    }
  })

  it("round breakdown fixtures match computeRoundScoreBreakdown", () => {
    for (const fixture of ROUND_BREAKDOWN_FIXTURES) {
      const breakdown = computeRoundScoreBreakdown({
        handSize: fixture.handSize,
        playerIndex: 0,
        player: fixture.player,
        roundPlayers: fixture.roundPlayers,
      })
      expect(breakdown.main, `${fixture.label} main`).toBe(fixture.expectedMain)
      expect(breakdown.bonus, `${fixture.label} bonus`).toBe(fixture.expectedBonus)
      expect(breakdown.total, `${fixture.label} total`).toBe(fixture.expectedTotal)
    }
  })

  it("bonus rates match score-rules functions", () => {
    const fourteenEvents = [
      { type: "fourteenBonus" as const, playerIndex: 0, suit: "green" as const },
      { type: "fourteenBonus" as const, playerIndex: 0, suit: "black" as const },
    ]
    expect(scoreFourteenBonus([fourteenEvents[0]])).toBe(SCORING_BONUS_RATES.fourteenStandard)
    expect(scoreFourteenBonus([fourteenEvents[1]])).toBe(SCORING_BONUS_RATES.fourteenBlack)

    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "pirate",
          count: 1,
        },
      ]),
    ).toBe(SCORING_BONUS_RATES.pirateCapturesMermaid)

    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "king",
          count: 1,
        },
      ]),
    ).toBe(SCORING_BONUS_RATES.kingCapturesPirate)

    expect(
      scoreHeroCaptures([
        {
          type: "characterCapture",
          capturerIndex: 0,
          capturingCard: "mermaid",
          count: 1,
        },
      ]),
    ).toBe(SCORING_BONUS_RATES.mermaidCapturesKing)

    const allyA: PlayerRoundData = {
      bid: 2,
      won: 2,
      harryGiantBidDelta: null,
      events: [{ type: "alliance", lootPlayerIndex: 0, trickWinnerIndex: 1 }],
      score: 0,
    }
    const allyB: PlayerRoundData = {
      bid: 1,
      won: 1,
      harryGiantBidDelta: null,
      events: [],
      score: 0,
    }
    expect(scoreAlliance(0, allyA, [allyA, allyB], 5)).toBe(SCORING_BONUS_RATES.alliance)

    const rascalPlayer: PlayerRoundData = {
      bid: 3,
      won: 3,
      harryGiantBidDelta: null,
      events: [{ type: "pirateAbility", ownerIndex: 0, pirate: "rascal", wager: 20 }],
      score: 0,
    }
    expect(scoreRascal(rascalPlayer.events, 0, 3, 3)).toBe(20)
  })

  it("inline bid/won snippets appear in both scoring docs", () => {
    for (const fixture of BID_WON_FIXTURES) {
      for (const snippet of fixture.docSnippets) {
        assertSnippetInAllDocs(docs, snippet, fixture.label)
      }
    }
  })

  it("quick-ref example snippets appear in scoring-quick-ref.md", () => {
    for (const fixture of [...BID_WON_QUICK_REF_FIXTURES, ...ROUND_BREAKDOWN_FIXTURES]) {
      for (const snippet of fixture.docSnippets) {
        assertSnippetInDoc(quickRefPath, quickRefContent, snippet, fixture.label)
      }
    }
  })

  it("formula multipliers appear in both scoring docs", () => {
    for (const snippet of SCORING_FORMULA_SNIPPETS) {
      assertSnippetInAllDocs(docs, snippet, "formula")
    }
  })

  it("bonus rate snippets appear in both scoring docs", () => {
    for (const snippet of SCORING_BONUS_DOC_SNIPPETS) {
      assertSnippetInAllDocs(docs, snippet, "bonus rate")
    }
  })

  it("shared policy snippets appear in both scoring docs", () => {
    for (const snippet of SHARED_DOC_SNIPPETS) {
      assertSnippetInAllDocs(docs, snippet, "shared policy")
    }
  })
})
