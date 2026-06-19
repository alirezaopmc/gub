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
  type AbilityResolution,
} from "@/lib/games/skull-king/engine/match-reducer"
import { buildPlayerRoundResults } from "@/lib/games/skull-king/engine/scoring-bridge"
import { getExpectedTurnSeat } from "@/lib/games/skull-king/engine/round"
import type { MatchConfig, MatchState, TigressMode } from "@/lib/games/skull-king/engine/types"
import { generateMatchCode, generatePlayerId, normalizeMatchCode } from "./match-code"

export type StoredPlayer = {
  id: string
  displayName: string
  seatIndex: number
}

export type StoredMatch = {
  state: MatchState
  players: StoredPlayer[]
  createdAt: number
  expiresAt: number
}

const MATCH_TTL_MS = 4 * 60 * 60 * 1000

const matches = new Map<string, StoredMatch>()

function pruneExpired(): void {
  const now = Date.now()
  for (const [code, m] of matches) {
    if (m.expiresAt < now) matches.delete(code)
  }
}

function takenCodes(): Set<string> {
  return new Set(matches.keys())
}

export function createMatch(hostName: string, playerCount: number): StoredMatch {
  pruneExpired()
  const code = generateMatchCode(takenCodes())
  const hostId = generatePlayerId()
  const maxSeats = Math.min(8, Math.max(3, playerCount))
  const config = defaultMatchConfig(maxSeats)
  config.playerNames = Array.from({ length: maxSeats }, (_, i) =>
    i === 0 ? hostName : `Player ${i + 1}`
  )

  const state = createMatchState(code, hostId, config)
  const stored: StoredMatch = {
    state,
    players: [{ id: hostId, displayName: hostName, seatIndex: 0 }],
    createdAt: Date.now(),
    expiresAt: Date.now() + MATCH_TTL_MS,
  }
  matches.set(code, stored)
  return stored
}

export function getMatch(code: string): StoredMatch | null {
  pruneExpired()
  return matches.get(normalizeMatchCode(code)) ?? null
}

export function joinMatch(
  code: string,
  displayName: string
): { match: StoredMatch; playerId: string } | null {
  const stored = getMatch(code)
  if (!stored) return null
  if (stored.state.phase !== "lobby") return null
  if (stored.players.length >= stored.state.config.playerCount) return null

  const playerId = generatePlayerId()
  const seatIndex = stored.players.length
  stored.players.push({ id: playerId, displayName, seatIndex })

  const names = [...stored.state.config.playerNames]
  names[seatIndex] = displayName

  stored.state = {
    ...stored.state,
    playerIds: [...stored.state.playerIds, playerId],
    config: { ...stored.state.config, playerNames: names },
    version: stored.state.version + 1,
  }

  return { match: stored, playerId }
}

export type PublicPlayerRoundResult = {
  seatIndex: number
  bid: number | null
  won: number
  main: number
  bonus: number
  total: number
  madeBid: boolean
}

export type PublicRoundSummary = {
  roundIndex: number
  handSize: number
  dealerIndex: number
  leaderIndex: number
  results: PublicPlayerRoundResult[]
}

export type PublicRoundView = {
  phase: NonNullable<MatchState["currentRound"]>["phase"]
  roundIndex: number
  handSize: number
  hand: NonNullable<MatchState["currentRound"]>["hands"][number]
  handCounts: number[]
  bids: Array<{ bid: number | null }>
  tricksWon: number[]
  dealerIndex: number
  leaderIndex: number
  trickLeaderIndex: number
  expectedTurnSeat: number
  roundsTotal: number
  currentTrick: Array<{ seatIndex: number; cardId: string }>
  pendingAbility: NonNullable<MatchState["currentRound"]>["pendingAbility"]
  roundScores: number[] | null
  results: PublicPlayerRoundResult[] | null
}

export type PublicMatchView = {
  code: string
  phase: MatchState["phase"]
  version: number
  config: MatchConfig
  players: Array<{ seatIndex: number; displayName: string; isHost: boolean }>
  cumulativeScores: number[]
  provisionalScores: number[]
  roundHistory: PublicRoundSummary[]
  winners: number[] | null
  round: PublicRoundView | null
  viewerIsHost: boolean
  viewerSeat: number
}

function buildProvisionalScores(state: MatchState): number[] {
  const round = state.currentRound
  return state.cumulativeScores.map((s, i) => {
    if (round?.phase === "scoring" && round.roundScores) {
      return s + (round.roundScores[i] ?? 0)
    }
    return s
  })
}

function sanitizeRoundHistory(state: MatchState): PublicRoundSummary[] {
  return state.roundHistory.map((entry) => ({
    roundIndex: entry.roundIndex,
    handSize: entry.handSize,
    dealerIndex: entry.dealerIndex,
    leaderIndex: entry.leaderIndex,
    results: entry.results,
  }))
}

function sanitizeRoundForViewer(state: MatchState, viewerSeat: number): PublicRoundView | null {
  const round = state.currentRound
  if (!round) return null
  const playerCount = state.config.playerCount
  return {
    phase: round.phase,
    roundIndex: round.roundIndex,
    handSize: round.handSize,
    hand: round.hands[viewerSeat] ?? [],
    handCounts: round.hands.map((h) => h.length),
    bids: round.bids.map((b) => ({ bid: b.bid })),
    tricksWon: round.tricksWon,
    dealerIndex: round.dealerIndex,
    leaderIndex: round.leaderIndex,
    trickLeaderIndex: round.trickLeaderIndex,
    expectedTurnSeat: getExpectedTurnSeat(round, playerCount),
    roundsTotal: state.config.roundsSchema.length,
    currentTrick: round.currentTrick.map((p) => ({
      seatIndex: p.playerIndex,
      cardId: p.card.id,
    })),
    pendingAbility: round.pendingAbility,
    roundScores: round.roundScores,
    results:
      round.phase === "scoring" && round.roundScores
        ? buildPlayerRoundResults(round, state.config)
        : null,
  }
}

export function getPublicView(code: string, playerId: string): PublicMatchView | null {
  const stored = getMatch(code)
  if (!stored) return null
  const player = stored.players.find((p) => p.id === playerId)
  if (!player) return null

  return {
    code: stored.state.code,
    phase: stored.state.phase,
    version: stored.state.version,
    config: stored.state.config,
    players: stored.players.map((p) => ({
      seatIndex: p.seatIndex,
      displayName: p.displayName,
      isHost: p.id === stored.state.hostPlayerId,
    })),
    cumulativeScores: stored.state.cumulativeScores,
    provisionalScores: buildProvisionalScores(stored.state),
    roundHistory: sanitizeRoundHistory(stored.state),
    winners: stored.state.winners,
    round: sanitizeRoundForViewer(stored.state, player.seatIndex),
    viewerIsHost: player.id === stored.state.hostPlayerId,
    viewerSeat: player.seatIndex,
  }
}

export function updateMatchConfig(
  code: string,
  hostId: string,
  patch: Partial<MatchConfig>
): StoredMatch | { error: string } {
  const stored = getMatch(code)
  if (!stored) return { error: "not_found" }
  if (stored.state.hostPlayerId !== hostId) return { error: "not_host" }
  if (stored.state.phase !== "lobby") return { error: "invalid_phase" }

  stored.state = {
    ...stored.state,
    config: { ...stored.state.config, ...patch },
    version: stored.state.version + 1,
  }
  return stored
}

export function dispatchAction(
  code: string,
  playerId: string,
  action: {
    type: string
    bid?: number
    cardId?: string
    tigressMode?: TigressMode
    ability?: AbilityResolution
    seed?: number
  }
): { view: PublicMatchView } | { error: string } {
  const stored = getMatch(code)
  if (!stored) return { error: "not_found" }
  const player = stored.players.find((p) => p.id === playerId)
  if (!player) return { error: "not_player" }

  const seat = player.seatIndex
  const seed = action.seed ?? Date.now()
  let state = stored.state

  switch (action.type) {
    case "start_match":
      if (playerId !== state.hostPlayerId) return { error: "not_host" }
      if (stored.players.length < 3) return { error: "need_3_players" }
      state = reconcileMatchToSeatedPlayers(state, stored.players.length)
      state = startMatch(state, seed)
      state = startRound(state, seed + 1)
      break
    case "start_round":
      if (playerId !== state.hostPlayerId) return { error: "not_host" }
      state = startRound(state, seed)
      break
    case "submit_bid": {
      if (action.bid === undefined) return { error: "invalid_action" }
      const r = applyBid(state, seat, action.bid)
      if (typeof r === "object" && "error" in r) return { error: r.error }
      state = r
      break
    }
    case "play_card": {
      if (!action.cardId) return { error: "invalid_action" }
      const r = applyPlayCard(state, seat, action.cardId, action.tigressMode)
      if (typeof r === "object" && "error" in r) return { error: r.error }
      state = r
      break
    }
    case "resolve_ability": {
      if (!action.ability) return { error: "invalid_action" }
      const r = applyAbility(state, action.ability)
      if (typeof r === "object" && "error" in r) return { error: r.error }
      state = r
      break
    }
    case "confirm_round":
      if (playerId !== state.hostPlayerId) return { error: "not_host" }
      state = confirmRound(state)
      break
    case "advance_round":
      if (playerId !== state.hostPlayerId) return { error: "not_host" }
      state = advanceRound(state, seed)
      break
    default:
      return { error: "invalid_action" }
  }

  stored.state = state
  const view = getPublicView(code, playerId)
  if (!view) return { error: "not_found" }
  return { view }
}
