"use client"

import { Tooltip } from "radix-ui"

import { PlayerRoundStatsRow } from "@/components/games/skull-king/round-score/table/player-round-stats-row"
import styles from "@/components/games/skull-king/round-score/styles/round-score.module.css"
import { cn } from "@/lib/utils"

export type RoundStatsReadOnlyRow = {
  bid: number | null
  won: number
  main: number
  bonus: number
  total: number
  madeBid: boolean
}

export type RoundStatsReadOnlyTableProps = {
  players: readonly string[]
  results: readonly RoundStatsReadOnlyRow[]
  leaderIndex: number
  handSize: number
  /** Running voyage total through this round (shown under name). */
  provisionalTotals?: readonly number[]
}

export function RoundStatsReadOnlyTable({
  players,
  results,
  leaderIndex,
  handSize,
  provisionalTotals,
}: RoundStatsReadOnlyTableProps) {
  return (
    <Tooltip.Provider delayDuration={180}>
      <div className={styles.tableScroll}>
        <div className={cn(styles.table, styles.tableGridStatsWithScore)}>
          <div className={styles.headerRow} role="row">
            <div className={cn(styles.headerCell, styles.headerCellRank)} role="columnheader">
              #
            </div>
            <div className={styles.headerCell} role="columnheader">
              Name
            </div>
            <div
              className={cn(styles.headerCell, styles.headerCellBidWon, styles.headerBidWonSplit)}
              role="columnheader"
            >
              <span>Bid</span>
              <span className={styles.bidWonSep} aria-hidden>
                {" | "}
              </span>
              <span>Won</span>
            </div>
            <div
              className={cn(styles.headerCell, styles.headerCellRoundScore)}
              role="columnheader"
              aria-label="Points for this round"
            >
              Round
            </div>
          </div>
          {results.map((row, i) => {
            const name = players[i]?.trim() ?? `Player ${i + 1}`
            return (
              <PlayerRoundStatsRow
                key={i}
                rank={i + 1}
                playerName={name}
                isRoundStarter={leaderIndex === i}
                bid={row.bid}
                won={row.won}
                maxTricks={handSize}
                editableBid={false}
                editableWon={false}
                showWon
                runningTotalThroughRound={provisionalTotals?.[i]}
                roundScore={{ kind: "final", main: row.main, bonus: row.bonus }}
              />
            )
          })}
        </div>
      </div>
    </Tooltip.Provider>
  )
}
