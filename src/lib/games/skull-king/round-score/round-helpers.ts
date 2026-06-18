import { effectiveTricksBid } from "@/lib/games/skull-king/round-score/bid-won-validation"
import { computeRoundScoreBreakdown } from "@/lib/games/skull-king/round-score/score-rules"
import type { PlayerRoundData, RoundData } from "@/lib/games/skull-king/round-score/types"

export function createEmptyPlayerRoundData(): PlayerRoundData {
  return { bid: null, won: null, events: [], harryGiantBidDelta: null, score: 0 }
}

export function createEmptyRound(playerCount: number): RoundData {
  return {
    finalized: false,
    bidsSheetDismissed: false,
    players: Array.from({ length: playerCount }, () => createEmptyPlayerRoundData()),
  }
}

export function createEmptyRounds(playerCount: number, roundCount: number): RoundData[] {
  return Array.from({ length: roundCount }, () => createEmptyRound(playerCount))
}

/** Seat index (same as `config.players` index) of who leads the current round.
 * Rotates through `namedPlayerSeats` in list order each round: 1 → 2 → 3 → … → 1. */
export function startingPlayerSeatForRound(
  roundIndex: number,
  namedPlayerSeats: readonly number[]
): number | null {
  if (namedPlayerSeats.length === 0) return null
  return namedPlayerSeats[roundIndex % namedPlayerSeats.length]!
}

/** Sum of per-round `score` for finalized rounds only, from 0 through `throughRoundInclusive`. */
export function cumulativeScoreForPlayer(
  rounds: readonly RoundData[],
  throughRoundInclusive: number,
  playerIndex: number
): number {
  if (rounds.length === 0) return 0
  const up = Math.max(0, Math.min(throughRoundInclusive, rounds.length - 1))
  let sum = 0
  for (let r = 0; r <= up; r++) {
    if (!rounds[r]?.finalized) continue
    const sc = rounds[r]!.players[playerIndex]?.score
    sum += typeof sc === "number" && Number.isFinite(sc) ? sc : 0
  }
  return sum
}

/**
 * Voyage total through `roundIndex` as shown on the round screen: finalized sums plus,
 * when this round isn’t finalized yet, a live main+bonus preview once bid and won are known.
 */
export function voyageRunningTotalThroughRoundView(
  rounds: readonly RoundData[],
  roundIndex: number,
  playerIndex: number,
  handSize: number,
): number {
  if (rounds.length === 0) return 0
  const safeIndex = Math.max(0, Math.min(roundIndex, rounds.length - 1))
  const row = rounds[safeIndex]
  const finalizedTotal = cumulativeScoreForPlayer(rounds, safeIndex, playerIndex)
  if (!row || row.finalized) return finalizedTotal

  const rp = row.players[playerIndex]
  if (!rp) return finalizedTotal

  const eff = effectiveTricksBid(handSize, rp.bid, rp.harryGiantBidDelta)
  const tricksTallied = eff !== null && rp.won !== null
  if (!tricksTallied) return finalizedTotal

  const b = computeRoundScoreBreakdown({
    handSize,
    playerIndex,
    player: rp,
    roundPlayers: row.players,
  })
  return finalizedTotal + b.main + b.bonus
}
