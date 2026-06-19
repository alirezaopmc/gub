import { describe, expect, it } from "vitest"

import {
  computeRoundScoreBreakdown,
  scoreBidWon,
  scoreFourteenBonus,
  scoreHeroCaptures,
} from "@/lib/games/skull-king/round-score/score-rules"
import type { PlayerRoundData } from "@/lib/games/skull-king/round-score/types"

describe("score-rules bid/won", () => {
  it("bid 3 take 3 earns 60", () => {
    expect(scoreBidWon(5, 3, 3)).toBe(60)
  })

  it("bid 2 take 4 loses 20", () => {
    expect(scoreBidWon(5, 2, 4)).toBe(-20)
  })

  it("bid 0 take 0 earns 10 x hand", () => {
    expect(scoreBidWon(7, 0, 0)).toBe(70)
  })

  it("bid 0 take 2 loses 10 x hand", () => {
    expect(scoreBidWon(9, 0, 2)).toBe(-90)
  })
})

describe("score-rules bonuses", () => {
  const playerCorrect: PlayerRoundData = {
    bid: 2,
    won: 2,
    harryGiantBidDelta: null,
    events: [
      { type: "fourteenBonus", playerIndex: 0, suit: "green" },
      { type: "characterCapture", capturerIndex: 0, capturingCard: "mermaid", count: 1 },
    ],
    score: 0,
  }

  const playerMiss: PlayerRoundData = {
    bid: 2,
    won: 3,
    harryGiantBidDelta: null,
    events: playerCorrect.events,
    score: 0,
  }

  it("bonuses when bid correct", () => {
    const b = computeRoundScoreBreakdown({
      handSize: 5,
      playerIndex: 0,
      player: playerCorrect,
      roundPlayers: [playerCorrect],
    })
    expect(b.main).toBe(40)
    expect(b.bonus).toBe(10 + 40)
  })

  it("forfeits bonuses when bid missed", () => {
    const b = computeRoundScoreBreakdown({
      handSize: 5,
      playerIndex: 0,
      player: playerMiss,
      roundPlayers: [playerMiss],
    })
    expect(b.bonus).toBe(0)
    expect(scoreFourteenBonus(playerMiss.events)).toBeGreaterThan(0)
    expect(scoreHeroCaptures(playerMiss.events)).toBeGreaterThan(0)
  })
})
