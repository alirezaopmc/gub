"use client"

import {
  RoundStatsReadOnlyTable,
  type RoundStatsReadOnlyRow,
} from "@/components/games/skull-king/round-score/table/round-stats-readonly-table"
import type {
  PublicMatchView,
  PublicPlayerRoundResult,
  PublicRoundSummary,
} from "@/lib/games/skull-king/session/match-store"

function playerNames(view: PublicMatchView): string[] {
  return view.players.map((p) => p.displayName)
}

function toReadOnlyRows(results: readonly PublicPlayerRoundResult[]): RoundStatsReadOnlyRow[] {
  return results.map((r) => ({
    bid: r.bid,
    won: r.won,
    main: r.main,
    bonus: r.bonus,
    total: r.total,
    madeBid: r.madeBid,
  }))
}

export type PlayRoundResultsTableProps = {
  view: PublicMatchView
  summary: PublicRoundSummary
  /** When omitted, uses live provisional voyage totals. */
  totalsThroughRound?: readonly number[]
}

export function voyageTotalsThroughRound(
  view: PublicMatchView,
  throughRoundIndex: number
): number[] {
  const totals = Array.from({ length: view.players.length }, () => 0)
  for (const entry of view.roundHistory) {
    if (entry.roundIndex > throughRoundIndex) break
    entry.results.forEach((r) => {
      totals[r.seatIndex] = (totals[r.seatIndex] ?? 0) + r.total
    })
  }
  return totals
}

export function PlayRoundResultsTable({
  view,
  summary,
  totalsThroughRound,
}: PlayRoundResultsTableProps) {
  const names = playerNames(view)
  const provisionalTotals =
    totalsThroughRound ??
    (view.round?.phase === "scoring"
      ? view.provisionalScores
      : voyageTotalsThroughRound(view, summary.roundIndex))

  return (
    <RoundStatsReadOnlyTable
      players={names}
      results={toReadOnlyRows(summary.results)}
      leaderIndex={summary.leaderIndex}
      handSize={summary.handSize}
      provisionalTotals={provisionalTotals}
    />
  )
}

export function currentRoundSummary(view: PublicMatchView): PublicRoundSummary | null {
  const round = view.round
  if (!round?.results) return null
  return {
    roundIndex: round.roundIndex,
    handSize: round.handSize,
    dealerIndex: round.dealerIndex,
    leaderIndex: round.leaderIndex,
    results: round.results,
  }
}
