"use client"

import * as React from "react"
import { Tooltip } from "radix-ui"

import { PlayerRoundStatsRow } from "@/components/games/skull-king/round-score/table/player-round-stats-row"
import styles from "@/components/games/skull-king/round-score/styles/round-score.module.css"
import { cn } from "@/lib/utils"
import { nameEqualityKey } from "@/lib/games/skull-king/crew-name-validation"
import { effectiveTricksBid } from "@/lib/games/skull-king/round-score/bid-won-validation"
import { startingPlayerSeatForRound, voyageRunningTotalThroughRoundView } from "@/lib/games/skull-king/round-score/round-helpers"
import { computeRoundScoreBreakdown, previewActiveBonus } from "@/lib/games/skull-king/round-score/score-rules"
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"

export type CrewRoundStatsTableProps = {
  editableBid: boolean
  editableWon: boolean
  /**
   * When true, always show Bid | Won (won as read-only when not editable).
   * When false, bid-only phase hides the won column (narrow layout).
   */
  alwaysShowWonColumn?: boolean
  /** When true, show the Round score column (main + bonus / live bonus preview). */
  showRoundScoreColumn?: boolean
  /**
   * When true (e.g. Tricks won sheet), move initial focus to the first won input.
   * Pair with `onOpenAutoFocus` preventDefault on the dialog so bid isn’t focused first.
   */
  autoFocusFirstWon?: boolean
  /**
   * Bid won / tricks sheets: name cell shows only the crew label — no voyage total,
   * no round-lead star. Pair with `showRoundScoreColumn={false}` for # | Name | Bid | Won only.
   */
  plainNameColumn?: boolean
}

export function CrewRoundStatsTable({
  editableBid,
  editableWon,
  alwaysShowWonColumn = false,
  showRoundScoreColumn = true,
  autoFocusFirstWon = false,
  plainNameColumn = false,
}: CrewRoundStatsTableProps) {
  const config = useRoundScoreStore((s) => s.config)
  const rounds = useRoundScoreStore((s) => s.rounds)
  const currentRoundIndex = useRoundScoreStore((s) => s.currentRoundIndex)
  const setPlayerBid = useRoundScoreStore((s) => s.setPlayerBid)
  const setPlayerWon = useRoundScoreStore((s) => s.setPlayerWon)

  const bidInputRefs = React.useRef<(HTMLInputElement | null)[]>([])
  const wonInputRefs = React.useRef<(HTMLInputElement | null)[]>([])
  /** Avoid stealing focus back to won[0] on every rounds store update while tricks sheet is open. */
  const autoFocusWonConsumedRef = React.useRef(false)
  const tricksWonFocusRoundRef = React.useRef<number | null>(null)
  const prevAutoFocusFirstWonRef = React.useRef(false)

  const showWon = alwaysShowWonColumn || !(editableBid && !editableWon)

  React.useLayoutEffect(() => {
    if (!autoFocusFirstWon || !editableWon || !showWon) {
      tricksWonFocusRoundRef.current = null
      autoFocusWonConsumedRef.current = false
      prevAutoFocusFirstWonRef.current = autoFocusFirstWon
      return
    }
    if (autoFocusFirstWon && !prevAutoFocusFirstWonRef.current) {
      autoFocusWonConsumedRef.current = false
    }
    prevAutoFocusFirstWonRef.current = autoFocusFirstWon

    if (!config || rounds.length === 0) return
    if (!rounds[currentRoundIndex]) return

    if (tricksWonFocusRoundRef.current !== currentRoundIndex) {
      tricksWonFocusRoundRef.current = currentRoundIndex
      autoFocusWonConsumedRef.current = false
    }

    if (autoFocusWonConsumedRef.current) return
    const el = wonInputRefs.current[0]
    if (!el) return
    el.focus()
    autoFocusWonConsumedRef.current = true
  }, [autoFocusFirstWon, editableWon, showWon, currentRoundIndex, config, rounds])

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
      <div
        className={cn(
          styles.table,
          showRoundScoreColumn ? styles.tableGridStatsWithScore : styles.tableGridStats,
          !showWon &&
            (showRoundScoreColumn ? styles.tableGridStatsWithScoreBidOnly : styles.tableGridStatsBidOnly),
        )}
      >
        <div className={styles.headerRow} role="row">
          <div className={cn(styles.headerCell, styles.headerCellRank)} role="columnheader">
            #
          </div>
          <div className={styles.headerCell} role="columnheader">
            Name
          </div>
          <div
            className={cn(
              styles.headerCell,
              styles.headerCellBidWon,
              showWon && styles.headerBidWonSplit,
            )}
            role="columnheader"
          >
            {showWon ? (
              <>
                <span>Bid</span>
                <span className={styles.bidWonSep} aria-hidden>
                  {" | "}
                </span>
                <span>Won</span>
              </>
            ) : (
              "Bid"
            )}
          </div>
          {showRoundScoreColumn ? (
            <div
              className={cn(styles.headerCell, styles.headerCellRoundScore)}
              role="columnheader"
              aria-label="Points for this round — tricks and bonuses for this deal only, not the voyage total"
            >
              Round
            </div>
          ) : null}
        </div>
        {namedIndices.map((playerIndex, i) => {
          const name = config.players[playerIndex]?.trim() ?? ""
          const rp = round.players[playerIndex]!
          const lastBidRow = i === namedIndices.length - 1
          const roundScore = showRoundScoreColumn
            ? (() => {
                const eff = effectiveTricksBid(maxTricks, rp.bid, rp.harryGiantBidDelta)
                const tricksTallied = eff !== null && rp.won !== null
                if (round.finalized || tricksTallied) {
                  const b = computeRoundScoreBreakdown({
                    handSize: maxTricks,
                    playerIndex,
                    player: rp,
                    roundPlayers: round.players,
                  })
                  return { kind: "final" as const, main: b.main, bonus: b.bonus }
                }
                return { kind: "preview" as const, bonus: previewActiveBonus(rp) }
              })()
            : null
          const runningTotalThroughRound = plainNameColumn
            ? undefined
            : voyageRunningTotalThroughRoundView(rounds, currentRoundIndex, playerIndex, maxTricks)
          const isRoundStarter =
            !plainNameColumn && leadSeat !== null && playerIndex === leadSeat
          return (
            <PlayerRoundStatsRow
              key={playerIndex}
              rank={i + 1}
              playerName={name}
              isRoundStarter={isRoundStarter}
              {...(runningTotalThroughRound !== undefined
                ? { runningTotalThroughRound }
                : {})}
              bid={rp.bid}
              won={rp.won}
              maxTricks={maxTricks}
              editableBid={editableBid}
              editableWon={editableWon}
              onBidChange={(v) => setPlayerBid(playerIndex, v)}
              onWonChange={(v) => setPlayerWon(playerIndex, v)}
              harryGiantBidDelta={rp.harryGiantBidDelta}
              showWon={showWon}
              roundScore={roundScore}
              bidInputRef={(el) => {
                bidInputRefs.current[i] = el
              }}
              bidFocusNext={
                editableBid && !lastBidRow
                  ? () => bidInputRefs.current[i + 1]?.focus()
                  : undefined
              }
              wonInputRef={(el) => {
                wonInputRefs.current[i] = el
              }}
              wonFocusNext={
                editableWon && showWon && !lastBidRow
                  ? () => wonInputRefs.current[i + 1]?.focus()
                  : undefined
              }
            />
          )
        })}
      </div>
    </div>
    </Tooltip.Provider>
  )
}
