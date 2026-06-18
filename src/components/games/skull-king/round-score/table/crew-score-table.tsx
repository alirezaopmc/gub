"use client"

import { Tooltip } from "radix-ui"

import { PlayerScoreRow } from "@/components/games/skull-king/round-score/table/player-score-row"
import styles from "@/components/games/skull-king/round-score/styles/round-score.module.css"
import { cn } from "@/lib/utils"
import { nameEqualityKey } from "@/lib/games/skull-king/crew-name-validation"
import { cumulativeScoreForPlayer, startingPlayerSeatForRound } from "@/lib/games/skull-king/round-score/round-helpers"
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"

export function CrewScoreTable() {
  const config = useRoundScoreStore((s) => s.config)
  const rounds = useRoundScoreStore((s) => s.rounds)
  const currentRoundIndex = useRoundScoreStore((s) => s.currentRoundIndex)

  if (!config || rounds.length === 0) return null

  const round = rounds[currentRoundIndex]
  if (!round) return null

  const namedIndices = config.players
    .map((p, i) => (nameEqualityKey(p) !== "" ? i : null))
    .filter((i): i is number => i !== null)

  const maxTricks = config.roundsSchema[currentRoundIndex] ?? 0
  const leadSeat = startingPlayerSeatForRound(currentRoundIndex, namedIndices)

  return (
    <Tooltip.Provider delayDuration={180}>
      <div className={styles.tableScroll}>
      <div className={cn(styles.table, styles.tableGridVoyage)}>
        <div className={styles.headerRow} role="row">
          <div className={cn(styles.headerCell, styles.headerCellRank)} role="columnheader">
            #
          </div>
          <div className={styles.headerCell} role="columnheader">
            Name
          </div>
          <div className={cn(styles.headerCell, styles.headerCellBidWon)} role="columnheader">
            Bid
          </div>
          <div
            className={cn(styles.headerCell, styles.headerCellVoyagePts)}
            role="columnheader"
            aria-label="Points for this round — tricks and bonuses for this deal only, not the voyage total"
          >
            <span className={styles.voyagePtsHeaderName}>Round</span>
          </div>
          <div
            className={cn(styles.headerCell, styles.headerCellVoyagePts)}
            role="columnheader"
            aria-label="Total points"
          >
            <span className={styles.voyagePtsHeaderName}>
              <span className={styles.voyageTotalHdrDesktop}>Total points</span>
              <span className={styles.voyageTotalHdrMobile}>Total</span>
            </span>
          </div>
          <div className={styles.headerCellEvents} role="columnheader">
            Events
          </div>
        </div>
        {namedIndices.map((playerIndex, i) => {
          const name = config.players[playerIndex]?.trim() ?? ""
          const cumulative = cumulativeScoreForPlayer(rounds, currentRoundIndex, playerIndex)
          const pr = round.players[playerIndex]!
          return (
            <PlayerScoreRow
              key={playerIndex}
              rank={i + 1}
              playerName={name}
              isRoundStarter={leadSeat !== null && playerIndex === leadSeat}
              voyagePoints={{
                thisRound: round.finalized ? pr.score : null,
                total: cumulative,
              }}
              roundPlayer={pr}
              maxTricks={maxTricks}
              allPlayerNames={config.players}
              playerIndex={playerIndex}
            />
          )
        })}
      </div>
    </div>
    </Tooltip.Provider>
  )
}
