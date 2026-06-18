import { create } from "zustand"

import { clampCrewPlayerName } from "@/lib/games/skull-king/crew-name-validation"
import type { SkullKingGameConfig } from "@/lib/games/skull-king/skull-king-game-config"
import { computePlayerRoundScore } from "@/lib/games/skull-king/round-score/compute-round-score"
import { clampTricksToHand } from "@/lib/games/skull-king/round-score/bid-won-validation"
import { loadRoundData, saveRoundData } from "@/lib/games/skull-king/round-score/round-data-storage"
import { createEmptyRound, createEmptyRounds } from "@/lib/games/skull-king/round-score/round-helpers"
import type { BidWonModalRoundSnapshot, RoundData, RoundEvent } from "@/lib/games/skull-king/round-score/types"
import { MAX_EVENTS_PER_PLAYER_ROUND } from "@/lib/games/skull-king/round-score/types"

function cloneEvent(e: RoundEvent): RoundEvent {
  switch (e.type) {
    case "legacy":
      return {
        type: "legacy",
        kind: e.kind,
        label: e.label,
        ...(e.loggedAt != null ? { loggedAt: e.loggedAt } : {}),
      }
    case "alliance":
      return {
        type: "alliance",
        lootPlayerIndex: e.lootPlayerIndex,
        trickWinnerIndex: e.trickWinnerIndex,
        ...(e.loggedAt != null ? { loggedAt: e.loggedAt } : {}),
      }
    case "pirateAbility":
      return {
        type: "pirateAbility",
        ownerIndex: e.ownerIndex,
        pirate: "rascal",
        wager: e.wager,
        ...(e.loggedAt != null ? { loggedAt: e.loggedAt } : {}),
      }
    case "characterCapture":
      return {
        type: "characterCapture",
        capturerIndex: e.capturerIndex,
        capturingCard: e.capturingCard,
        count: e.count,
        ...(e.loggedAt != null ? { loggedAt: e.loggedAt } : {}),
      }
    case "fourteenBonus":
      return {
        type: "fourteenBonus",
        playerIndex: e.playerIndex,
        suit: e.suit,
        ...(e.loggedAt != null ? { loggedAt: e.loggedAt } : {}),
      }
    default: {
      const _x: never = e
      return _x
    }
  }
}

function withLoggedAt(e: RoundEvent, at: number): RoundEvent {
  switch (e.type) {
    case "legacy":
      return { ...e, loggedAt: at }
    case "alliance":
      return { ...e, loggedAt: at }
    case "pirateAbility":
      return { ...e, loggedAt: at }
    case "characterCapture":
      return { ...e, loggedAt: at }
    case "fourteenBonus":
      return { ...e, loggedAt: at }
    default: {
      const _e: never = e
      return _e
    }
  }
}

function cloneRounds(rounds: RoundData[]): RoundData[] {
  return rounds.map((round) => ({
    finalized: round.finalized === true,
    bidsSheetDismissed: round.bidsSheetDismissed === true,
    players: round.players.map((p) => ({
      bid: p.bid,
      won: p.won,
      harryGiantBidDelta: p.harryGiantBidDelta === 1 || p.harryGiantBidDelta === -1 ? p.harryGiantBidDelta : null,
      score: typeof p.score === "number" && Number.isFinite(p.score) ? p.score : 0,
      events: p.events.map(cloneEvent),
    })),
  }))
}

function markRoundUnfinalized(round: RoundData): void {
  round.finalized = false
}

function pushEventWithCap(events: RoundEvent[], event: RoundEvent): void {
  events.push(event)
  while (events.length > MAX_EVENTS_PER_PLAYER_ROUND) {
    events.shift()
  }
}

export type RoundScoreStore = {
  config: SkullKingGameConfig | null
  currentRoundIndex: number
  /** Max round index the navigator may go to; increases when the host advances after finishing a round. */
  highestUnlockedRoundIndex: number
  rounds: RoundData[]
  initFromConfig: (config: SkullKingGameConfig) => void
  resetSession: () => void
  goToRound: (index: number) => void
  /** `allowUnlock: true` when advancing from the finish flow to open the next round. */
  nextRound: (options?: { allowUnlock?: boolean }) => void
  prevRound: () => void
  addEvent: (playerIndex: number, event: RoundEvent) => void
  /** Adds the same event to multiple players in one state update (e.g. alliance). */
  addEventToPlayerIndices: (playerIndices: number[], event: RoundEvent) => void
  removeEvent: (playerIndex: number, eventIndex: number) => void
  /** Remove the mirrored alliance rows from both players’ logs. */
  removeAlliancePair: (lootPlayerIndex: number, trickWinnerIndex: number) => void
  setPlayerBid: (playerIndex: number, bid: number | null) => void
  setPlayerWon: (playerIndex: number, won: number | null) => void
  /** Harry the Giant: adjust current bid and set B+1 / B−1 marker (no event log entry). */
  applyHarryGiantBidDelta: (playerIndex: number, delta: 1 | -1) => void
  /**
   * After bid, events, and tricks won: writes each player’s `score` for the current round
   * (see `computePlayerRoundScore`) and persists. Call before advancing to the next round.
   */
  finalizeCurrentRound: () => void
  /** Mark the current hand’s bids sheet as dismissed (Done); persisted on the round. */
  acknowledgeBidsSheet: () => void
  /** Restore bid/won/scores/`finalized` from a snapshot taken when Bid/Won modal opened (cancel/outside dismiss). */
  restoreCurrentRoundFromBidWonModalSnapshot: (snapshot: BidWonModalRoundSnapshot) => void
  /**
   * Replay this round: clears bid/won/scores/events for the viewed round and all later rounds,
   * and clamps `highestUnlockedRoundIndex` to that round so navigation stays consistent.
   */
  replayFromCurrentRound: () => void
}

export const useRoundScoreStore = create<RoundScoreStore>((set, get) => ({
  config: null,
  currentRoundIndex: 0,
  highestUnlockedRoundIndex: 0,
  rounds: [],

  initFromConfig: (config) => {
    const normalized: SkullKingGameConfig = {
      ...config,
      players: config.players.map(clampCrewPlayerName),
    }
    const playerCount = normalized.players.length
    const roundCount = config.roundsSchema.length
    const loaded = loadRoundData()
    if (
      loaded &&
      loaded.playerCount === playerCount &&
      loaded.roundCount === roundCount &&
      loaded.rounds.length === roundCount
    ) {
      const maxI = roundCount - 1
      const current = Math.max(0, Math.min(loaded.currentRoundIndex, maxI))
      const high = Math.max(0, Math.min(loaded.highestUnlockedRoundIndex, maxI))
      set({
        config: normalized,
        currentRoundIndex: current,
        highestUnlockedRoundIndex: Math.max(current, high),
        rounds: cloneRounds(loaded.rounds),
      })
    } else {
      set({
        config: normalized,
        currentRoundIndex: 0,
        highestUnlockedRoundIndex: 0,
        rounds: createEmptyRounds(playerCount, roundCount),
      })
    }
  },

  resetSession: () => set({ config: null, currentRoundIndex: 0, highestUnlockedRoundIndex: 0, rounds: [] }),

  goToRound: (index) => {
    const { rounds, highestUnlockedRoundIndex: hi } = get()
    if (rounds.length === 0) return
    const max = Math.min(rounds.length - 1, hi)
    set({ currentRoundIndex: Math.max(0, Math.min(max, index)) })
  },

  nextRound: (options) => {
    const { currentRoundIndex, rounds, highestUnlockedRoundIndex: hi } = get()
    if (rounds.length === 0) return
    if (currentRoundIndex >= rounds.length - 1) return
    const next = currentRoundIndex + 1
    if (next > hi && !options?.allowUnlock) return
    set({
      currentRoundIndex: next,
      highestUnlockedRoundIndex: Math.max(hi, next),
    })
  },

  prevRound: () => {
    const { currentRoundIndex } = get()
    if (currentRoundIndex <= 0) return
    set({ currentRoundIndex: currentRoundIndex - 1 })
  },

  addEvent: (playerIndex, event) => {
    const { config, currentRoundIndex, rounds } = get()
    if (!config || rounds.length === 0) return
    const r = currentRoundIndex
    const nextRounds = cloneRounds(rounds)
    const row = nextRounds[r]
    if (!row) return
    markRoundUnfinalized(row)
    const player = row.players[playerIndex]
    if (!player) return
    const events = [...player.events]
    const at = Date.now()
    pushEventWithCap(events, withLoggedAt(cloneEvent(event), at))
    player.events = events
    set({ rounds: nextRounds })
  },

  addEventToPlayerIndices: (playerIndices, event) => {
    const { config, currentRoundIndex, rounds } = get()
    if (!config || rounds.length === 0) return
    const r = currentRoundIndex
    const nextRounds = cloneRounds(rounds)
    const row0 = nextRounds[r]
    if (row0) markRoundUnfinalized(row0)
    const valid = playerIndices.filter((i) => nextRounds[r]!.players[i] != null)
    if (valid.length === 0) return
    const at = Date.now()
    const stamped = withLoggedAt(cloneEvent(event), at)
    for (const playerIndex of valid) {
      const player = nextRounds[r].players[playerIndex]!
      const nextEvents = [...player.events]
      pushEventWithCap(nextEvents, cloneEvent(stamped))
      player.events = nextEvents
    }
    set({ rounds: nextRounds })
  },

  removeEvent: (playerIndex, eventIndex) => {
    const { currentRoundIndex, rounds } = get()
    if (rounds.length === 0) return
    const r = currentRoundIndex
    const nextRounds = cloneRounds(rounds)
    const row0 = nextRounds[r]
    if (row0) markRoundUnfinalized(row0)
    const player = row0?.players[playerIndex]
    if (!player) return
    player.events = player.events.filter((_, i) => i !== eventIndex)
    set({ rounds: nextRounds })
  },

  removeAlliancePair: (lootPlayerIndex, trickWinnerIndex) => {
    const { currentRoundIndex, rounds } = get()
    if (rounds.length === 0) return
    const r = currentRoundIndex
    const nextRounds = cloneRounds(rounds)
    const row0 = nextRounds[r]
    if (!row0) return
    markRoundUnfinalized(row0)
    const matches = (e: RoundEvent) =>
      e.type === "alliance" &&
      e.lootPlayerIndex === lootPlayerIndex &&
      e.trickWinnerIndex === trickWinnerIndex
    for (const pi of [lootPlayerIndex, trickWinnerIndex]) {
      const p = row0.players[pi]
      if (!p) continue
      p.events = p.events.filter((e) => !matches(e))
    }
    set({ rounds: nextRounds })
  },

  setPlayerBid: (playerIndex, bid) => {
    const { config, currentRoundIndex, rounds } = get()
    if (!config || rounds.length === 0) return
    const handSize = config.roundsSchema[currentRoundIndex]
    if (handSize === undefined) return
    const nextRounds = cloneRounds(rounds)
    const row0 = nextRounds[currentRoundIndex]
    if (row0) markRoundUnfinalized(row0)
    const player = row0?.players[playerIndex]
    if (!player) return
    player.bid = clampTricksToHand(handSize, bid)
    player.harryGiantBidDelta = null
    set({ rounds: nextRounds })
  },

  applyHarryGiantBidDelta: (playerIndex, delta) => {
    const { config, currentRoundIndex, rounds } = get()
    if (!config || rounds.length === 0) return
    const handSize = config.roundsSchema[currentRoundIndex]
    if (handSize === undefined) return
    const nextRounds = cloneRounds(rounds)
    const row0 = nextRounds[currentRoundIndex]
    if (row0) markRoundUnfinalized(row0)
    const player = row0?.players[playerIndex]
    if (!player) return
    // Keep `bid` as the base in the cell; B±1 is in `harryGiantBidDelta` (see `effectiveTricksBid`).
    player.harryGiantBidDelta = delta
    set({ rounds: nextRounds })
  },

  setPlayerWon: (playerIndex, won) => {
    const { config, currentRoundIndex, rounds } = get()
    if (!config || rounds.length === 0) return
    const handSize = config.roundsSchema[currentRoundIndex]
    if (handSize === undefined) return
    const nextRounds = cloneRounds(rounds)
    const row0 = nextRounds[currentRoundIndex]
    if (row0) markRoundUnfinalized(row0)
    const player = row0?.players[playerIndex]
    if (!player) return
    player.won = clampTricksToHand(handSize, won)
    set({ rounds: nextRounds })
  },

  finalizeCurrentRound: () => {
    const { config, currentRoundIndex, rounds } = get()
    if (!config || rounds.length === 0) return
    const r = currentRoundIndex
    const handSize = config.roundsSchema[r]
    if (handSize === undefined) return
    const nextRounds = cloneRounds(rounds)
    const row = nextRounds[r]
    if (!row) return
    for (let i = 0; i < row.players.length; i++) {
      const player = row.players[i]
      if (!player) continue
      player.score = computePlayerRoundScore({
        roundIndex: r,
        handSize,
        playerIndex: i,
        player,
        roundPlayers: row.players,
        config,
      })
    }
    row.finalized = true
    set({ rounds: nextRounds })
  },

  acknowledgeBidsSheet: () => {
    const { currentRoundIndex, rounds } = get()
    if (rounds.length === 0) return
    const nextRounds = cloneRounds(rounds)
    const row = nextRounds[currentRoundIndex]
    if (!row) return
    row.bidsSheetDismissed = true
    set({ rounds: nextRounds })
  },

  restoreCurrentRoundFromBidWonModalSnapshot: (snapshot) => {
    const { currentRoundIndex, rounds } = get()
    if (rounds.length === 0) return
    const nextRounds = cloneRounds(rounds)
    const row = nextRounds[currentRoundIndex]
    if (!row || row.players.length !== snapshot.players.length) return
    row.finalized = snapshot.finalized
    row.bidsSheetDismissed = snapshot.bidsSheetDismissed
    for (let i = 0; i < row.players.length; i++) {
      const p = row.players[i]
      const s = snapshot.players[i]
      if (!p || !s) continue
      p.bid = s.bid
      p.won = s.won
      p.harryGiantBidDelta = s.harryGiantBidDelta
      p.score = s.score
    }
    set({ rounds: nextRounds })
  },

  replayFromCurrentRound: () => {
    const { config, currentRoundIndex, rounds } = get()
    if (!config || rounds.length === 0) return
    const maxI = rounds.length - 1
    const r = Math.max(0, Math.min(currentRoundIndex, maxI))
    const pc = config.players.length
    const nextRounds = cloneRounds(rounds)
    for (let j = r; j < nextRounds.length; j++) {
      nextRounds[j] = createEmptyRound(pc)
    }
    set({
      rounds: nextRounds,
      highestUnlockedRoundIndex: r,
      currentRoundIndex: r,
    })
  },
}))

useRoundScoreStore.subscribe((state) => {
  if (typeof window === "undefined") return
  const { config, currentRoundIndex, highestUnlockedRoundIndex, rounds } = state
  if (!config || rounds.length === 0) return
  saveRoundData({
    v: 1,
    playerCount: config.players.length,
    roundCount: config.roundsSchema.length,
    currentRoundIndex,
    highestUnlockedRoundIndex,
    rounds,
  })
})
