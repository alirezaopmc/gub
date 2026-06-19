/**
 * Skull King scoring — single source of truth for round points.
 *
 * Part 1: bid/won tricks. Part 2: bonuses (14, hero captures, alliance, Rascal).
 * Harry the Giant uses `effectiveTricksBid` (base bid ±1 clamped); see `bid-won-validation`.
 */

import { effectiveTricksBid } from "@/lib/games/skull-king/round-score/bid-won-validation"
import type { PlayerRoundData, RoundEvent } from "@/lib/games/skull-king/round-score/types"
import { MAX_MERMAIDS_IN_GAME, MAX_PIRATES_IN_GAME } from "@/lib/games/skull-king/round-score/types"

export type RoundScoreBreakdown = {
  /** Points from bid vs tricks won (Part 1). */
  main: number
  /** Bonuses: 14, captures, alliance, Rascal (Part 2). */
  bonus: number
  total: number
}

export type ScoreBreakdownContext = {
  handSize: number
  playerIndex: number
  player: PlayerRoundData
  roundPlayers: readonly PlayerRoundData[]
}

/** Clamp stored capture count to deck limits; mermaid→SK is always one trick. */
export function clampCharacterCaptureCount(
  capturingCard: "pirate" | "mermaid" | "king",
  raw: number
): number {
  const c = Math.floor(Number(raw))
  const base = Number.isFinite(c) && c >= 1 ? c : 1
  if (capturingCard === "mermaid") return 1
  if (capturingCard === "pirate") return Math.min(base, MAX_MERMAIDS_IN_GAME)
  return Math.min(base, MAX_PIRATES_IN_GAME)
}

/** Part 1 — `effectiveBid` is already the committed tricks bid (incl. Harry). */
export function scoreBidWon(handSize: number, effectiveBid: number | null, won: number | null): number {
  const n = Math.max(0, Math.floor(handSize))
  if (effectiveBid === null || won === null) return 0

  if (effectiveBid !== 0) {
    if (effectiveBid === won) return 20 * effectiveBid
    return -10 * Math.abs(effectiveBid - won)
  }

  if (won === 0) return 10 * n
  return -10 * n
}

/** Part 2.1 — fourteen bonus on this player’s event log. */
export function scoreFourteenBonus(events: readonly RoundEvent[]): number {
  let s = 0
  for (const e of events) {
    if (e.type !== "fourteenBonus") continue
    s += e.suit === "black" ? 20 : 10
  }
  return s
}

/** Part 2.2 — hero captures logged on the capturer’s row. */
export function scoreHeroCaptures(events: readonly RoundEvent[]): number {
  let s = 0
  for (const e of events) {
    if (e.type !== "characterCapture") continue
    const cnt = clampCharacterCaptureCount(e.capturingCard, e.count ?? 1)
    if (e.capturingCard === "pirate") s += 20 * cnt
    else if (e.capturingCard === "king") s += 30 * cnt
    else s += 40 * cnt
  }
  return s
}

/**
 * Part 2.3 — alliance: both linked players must have made bid (effective bid === won).
 * Event appears on each ally’s log; award at most once per qualifying event per player.
 */
export function scoreAlliance(
  playerIndex: number,
  player: PlayerRoundData,
  roundPlayers: readonly PlayerRoundData[],
  handSize: number
): number {
  let total = 0
  for (const e of player.events) {
    if (e.type !== "alliance") continue
    const a = e.lootPlayerIndex
    const b = e.trickWinnerIndex
    if (playerIndex !== a && playerIndex !== b) continue
    const pa = roundPlayers[a]
    const pb = roundPlayers[b]
    if (!pa || !pb) continue
    const bidA = effectiveTricksBid(handSize, pa.bid, pa.harryGiantBidDelta)
    const bidB = effectiveTricksBid(handSize, pb.bid, pb.harryGiantBidDelta)
    if (bidA === null || pa.won === null || bidB === null || pb.won === null) continue
    if (bidA === pa.won && bidB === pb.won) total += 20
  }
  return total
}

/**
 * Part 2.4 — Rascal: +wager if made bid, −wager if missed (wager is 10 or 20).
 */
export function scoreRascal(
  events: readonly RoundEvent[],
  playerIndex: number,
  effectiveBid: number | null,
  won: number | null
): number {
  if (effectiveBid === null || won === null) return 0
  let s = 0
  for (const e of events) {
    if (e.type !== "pirateAbility" || e.pirate !== "rascal") continue
    if (e.ownerIndex !== playerIndex) continue
    s += effectiveBid === won ? e.wager : -e.wager
  }
  return s
}

function madeBid(handSize: number, player: PlayerRoundData): boolean {
  const eff = effectiveTricksBid(handSize, player.bid, player.harryGiantBidDelta)
  return eff !== null && player.won !== null && eff === player.won
}

export function computeRoundScoreBreakdown(ctx: ScoreBreakdownContext): RoundScoreBreakdown {
  const { handSize, playerIndex, player, roundPlayers } = ctx
  const eff = effectiveTricksBid(handSize, player.bid, player.harryGiantBidDelta)
  const main = scoreBidWon(handSize, eff, player.won)
  const bonus = madeBid(handSize, player)
    ? scoreFourteenBonus(player.events) +
      scoreHeroCaptures(player.events) +
      scoreAlliance(playerIndex, player, roundPlayers, handSize) +
      scoreRascal(player.events, playerIndex, eff, player.won)
    : 0
  return { main, bonus, total: main + bonus }
}

/** Bonuses knowable before tricks won: 14 + hero captures only (for live round column). */
export function previewActiveBonus(player: PlayerRoundData): number {
  return scoreFourteenBonus(player.events) + scoreHeroCaptures(player.events)
}
