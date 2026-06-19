import { describe, expect, it } from "vitest"

import {
  advanceRound,
  applyBid,
  confirmRound,
  createMatchState,
  defaultMatchConfig,
  reconcileMatchToSeatedPlayers,
  startMatch,
  startRound,
} from "@/lib/games/skull-king/engine/match-reducer"

describe("match-reducer", () => {
  it("starts match and round", () => {
    const config = defaultMatchConfig(3)
    let state = createMatchState("AB", "host", config)
    state = startMatch(state, 99)
    state = startRound(state, 42)
    expect(state.currentRound?.phase).toBe("bidding")
    expect(state.currentRound?.hands).toHaveLength(3)
  })

  it("plays through bids to playing", () => {
    const config = defaultMatchConfig(2)
    let state = createMatchState("CD", "host", config)
    state = startMatch(state, 1)
    state = startRound(state, 5)
    state = applyBid(state, 0, 1) as typeof state
    state = applyBid(state, 1, 0) as typeof state
    expect(state.currentRound?.phase).toBe("playing")
  })

  it("ends match after final round", () => {
    const config = { ...defaultMatchConfig(2), roundsSchema: [1] }
    let state = createMatchState("EF", "host", config)
    state = startMatch(state, 1)
    state = startRound(state, 10)
    state = applyBid(state, 0, 1) as typeof state
    state = applyBid(state, 1, 0) as typeof state

    const round = state.currentRound!
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
    }

    state = confirmRound(state)
    expect(state.phase).toBe("game_over")
    expect(state.winners).toBeDefined()
    expect(state.roundHistory).toHaveLength(1)
    expect(state.roundHistory[0]?.roundIndex).toBe(0)
  })

  it("advance_round confirms scoring and deals next hand", () => {
    const config = { ...defaultMatchConfig(2), roundsSchema: [1, 1] }
    let state = createMatchState("IJ", "host", config)
    state = startMatch(state, 1)
    state = startRound(state, 10)
    state = applyBid(state, 0, 1) as typeof state
    state = applyBid(state, 1, 0) as typeof state

    const round = state.currentRound!
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
    }

    state = advanceRound(state, 99)
    expect(state.roundHistory).toHaveLength(1)
    expect(state.currentRound?.phase).toBe("bidding")
    expect(state.currentRound?.roundIndex).toBe(1)
  })

  it("accumulates round history across multiple confirms", () => {
    const config = { ...defaultMatchConfig(2), roundsSchema: [1, 1, 1] }
    let state = createMatchState("KL", "host", config)
    state = startMatch(state, 1)

    for (let i = 0; i < 2; i++) {
      state = startRound(state, 10 + i)
      state = applyBid(state, 0, 1) as typeof state
      state = applyBid(state, 1, 0) as typeof state
      const round = state.currentRound!
      state = {
        ...state,
        currentRound: {
          ...round,
          tricksWon: [1, 0],
          phase: "scoring",
          roundScores: [20, 0],
          currentTrick: [],
        },
      }
      state = confirmRound(state)
    }

    expect(state.roundHistory).toHaveLength(2)
    expect(state.roundHistory[0]?.roundIndex).toBe(0)
    expect(state.roundHistory[1]?.roundIndex).toBe(1)
  })

  it("3 seated with config 4 reconciles and enters playing after 3 bids", () => {
    const config = defaultMatchConfig(4)
    let state = createMatchState("GH", "host", config)
    state = {
      ...state,
      playerIds: ["host", "p2", "p3"],
      config: { ...config, playerNames: ["A", "B", "C", "D"] },
    }
    state = reconcileMatchToSeatedPlayers(state, 3)
    expect(state.config.playerCount).toBe(3)

    state = startMatch(state, 7)
    state = startRound(state, 8)
    expect(state.currentRound?.bids).toHaveLength(3)
    expect(state.currentRound?.hands).toHaveLength(3)

    state = applyBid(state, 0, 0) as typeof state
    state = applyBid(state, 1, 1) as typeof state
    state = applyBid(state, 2, 0) as typeof state
    expect(state.currentRound?.phase).toBe("playing")
    expect(state.currentRound?.trickLeaderIndex).toBe(state.currentRound?.leaderIndex)
  })
})

describe("rounds schema presets", () => {
  it("includes rulebook presets", async () => {
    const { ROUNDS_SCHEMA_PRESETS } = await import("@/lib/games/skull-king/rounds-schema")
    expect(ROUNDS_SCHEMA_PRESETS.whirlpool).toEqual([9, 9, 7, 7, 5, 5, 3, 3, 1, 1])
    expect(ROUNDS_SCHEMA_PRESETS.evenKeeled).toEqual([2, 4, 6, 8, 10])
  })
})
