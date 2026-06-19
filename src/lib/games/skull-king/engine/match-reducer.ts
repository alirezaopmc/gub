import { createRng, dealRound, leftOf } from "./deal"
import { BASE_DECK_CONFIG, FULL_DECK_CONFIG, type DeckConfig } from "./deck"
import {
  createRoundState,
  finalizeRoundScoring,
  nextRoundDealer,
  playCardOnRound,
  resolveAbilityOnRound,
  submitBidOnRound,
} from "./round"
import { buildPlayerRoundResults } from "./scoring-bridge"
import type {
  MatchConfig,
  MatchState,
  RoundHistoryEntry,
  RoundState,
  TigressMode,
} from "./types"

export type AbilityResolution =
  | { type: "rosie"; nextLeaderIndex: number }
  | { type: "bendt"; drawCardIds: string[]; discardCardIds: string[] }
  | { type: "rascal"; wager: 0 | 10 | 20 }
  | { type: "juanita" }
  | { type: "harry"; delta: 1 | -1 | 0 }

export function deckConfigFromArtifacts(artifacts: MatchConfig["artifacts"]): DeckConfig {
  return {
    includeKraken: artifacts.kraken,
    includeWhale: artifacts.whale,
    includeLoot: artifacts.loot,
  }
}

export function defaultMatchConfig(playerCount: number): MatchConfig {
  return {
    playerCount,
    playerNames: Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`),
    roundsSchema: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    artifacts: {
      pirateAbilities: false,
      characterCapture: true,
      whale: false,
      kraken: false,
      loot: false,
      fourteenBonus: true,
    },
  }
}

export function createMatchState(code: string, hostPlayerId: string, config: MatchConfig): MatchState {
  const playerIds = [hostPlayerId]
  return {
    code,
    hostPlayerId,
    playerIds,
    config,
    phase: "lobby",
    currentRound: null,
    cumulativeScores: Array(config.playerCount).fill(0),
    roundHistory: [],
    initialDealerIndex: 0,
    version: 1,
    winners: null,
  }
}

/** Shrink config/arrays to actual seated players before voyage start. */
export function reconcileMatchToSeatedPlayers(state: MatchState, seatedCount: number): MatchState {
  const count = Math.min(8, Math.max(3, seatedCount))
  const names = state.config.playerNames.slice(0, count)
  while (names.length < count) {
    names.push(`Player ${names.length + 1}`)
  }
  const scores = state.cumulativeScores.slice(0, count)
  while (scores.length < count) scores.push(0)

  return {
    ...state,
    playerIds: state.playerIds.slice(0, count),
    cumulativeScores: scores,
    config: {
      ...state.config,
      playerCount: count,
      playerNames: names,
    },
  }
}

export function seatedPlayerCount(state: MatchState): number {
  return state.config.playerCount
}

export function startMatch(state: MatchState, seed: number): MatchState {
  const rng = createRng(seed)
  const initialDealer = Math.floor(rng() * state.config.playerCount)
  return {
    ...state,
    phase: "in_progress",
    initialDealerIndex: initialDealer,
    cumulativeScores: Array(state.config.playerCount).fill(0),
    version: state.version + 1,
  }
}

export function startRound(state: MatchState, seed: number): MatchState {
  if (state.phase !== "in_progress") return state
  const roundIndex = state.currentRound
    ? state.currentRound.roundIndex + 1
    : state.roundHistory.length
  if (roundIndex >= state.config.roundsSchema.length) {
    return endMatch(state)
  }

  const schemaHand = state.config.roundsSchema[roundIndex] ?? 1
  const deckConfig = deckConfigFromArtifacts(state.config.artifacts)
  const dealerIndex =
    roundIndex === 0
      ? state.initialDealerIndex
      : state.currentRound
        ? nextRoundDealer(state.currentRound)
        : state.initialDealerIndex

  const seated = seatedPlayerCount(state)
  const { hands, undealt, handSize } = dealRound(
    deckConfig,
    seated,
    schemaHand,
    createRng(seed)
  )

  const round = createRoundState({
    roundIndex,
    handSize,
    dealerIndex,
    hands,
    undealt,
  })

  return {
    ...state,
    currentRound: round,
    version: state.version + 1,
  }
}

export function endMatch(state: MatchState): MatchState {
  const scores = state.cumulativeScores
  const max = Math.max(...scores)
  const winners = scores
    .map((s, i) => (s === max ? i : -1))
    .filter((i) => i >= 0)

  return {
    ...state,
    phase: "game_over",
    winners,
    version: state.version + 1,
  }
}

function snapshotRoundToHistory(
  state: MatchState,
  scored: RoundState
): RoundHistoryEntry {
  return {
    roundIndex: scored.roundIndex,
    handSize: scored.handSize,
    dealerIndex: scored.dealerIndex,
    leaderIndex: scored.leaderIndex,
    results: buildPlayerRoundResults(scored, state.config),
  }
}

export function confirmRound(state: MatchState): MatchState {
  const round = state.currentRound
  if (!round || round.phase !== "scoring") return state

  const scored = round.roundScores
    ? round
    : finalizeRoundScoring(round, state.config)

  const cumulativeScores = state.cumulativeScores.map(
    (s, i) => s + (scored.roundScores?.[i] ?? 0)
  )

  const roundHistory = [...state.roundHistory, snapshotRoundToHistory(state, scored)]

  const nextRoundIndex = scored.roundIndex + 1
  if (nextRoundIndex >= state.config.roundsSchema.length) {
    return endMatch({ ...state, cumulativeScores, roundHistory, currentRound: scored })
  }

  return {
    ...state,
    cumulativeScores,
    roundHistory,
    currentRound: null,
    version: state.version + 1,
  }
}

export function advanceRound(state: MatchState, seed: number): MatchState {
  const after = confirmRound(state)
  if (after.phase === "game_over") return after
  if (after.currentRound !== null) return after
  return startRound(after, seed)
}

export function applyBid(
  state: MatchState,
  playerIndex: number,
  bid: number
): MatchState | { error: string } {
  const round = state.currentRound
  if (!round) return { error: "no_round" }
  const result = submitBidOnRound(round, playerIndex, bid)
  if ("error" in result) return result
  return { ...state, currentRound: result, version: state.version + 1 }
}

export function applyPlayCard(
  state: MatchState,
  playerIndex: number,
  cardId: string,
  tigressMode?: TigressMode
): MatchState | { error: string } {
  const round = state.currentRound
  if (!round) return { error: "no_round" }
  const seated = seatedPlayerCount(state)
  const result = playCardOnRound(
    round,
    playerIndex,
    cardId,
    seated,
    state.config.artifacts,
    tigressMode
  )
  if ("error" in result) return result

  let updated = result.round
  if (updated.phase === "scoring" && !updated.pendingAbility) {
    updated = finalizeRoundScoring(updated, state.config)
  }

  return { ...state, currentRound: updated, version: state.version + 1 }
}

export function applyAbility(
  state: MatchState,
  resolution: AbilityResolution
): MatchState | { error: string } {
  const round = state.currentRound
  if (!round) return { error: "no_round" }
  const seated = seatedPlayerCount(state)
  const result = resolveAbilityOnRound(round, seated, resolution)
  if ("error" in result) return result

  let updated = result
  if (updated.phase === "scoring") {
    updated = finalizeRoundScoring(updated, state.config)
  }

  return { ...state, currentRound: updated, version: state.version + 1 }
}

export { BASE_DECK_CONFIG, FULL_DECK_CONFIG, leftOf }
