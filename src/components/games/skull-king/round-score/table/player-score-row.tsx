import { EventBadge } from "@/components/games/skull-king/round-score/events/event-badge"
import { PlayerRoundStatsRow } from "@/components/games/skull-king/round-score/table/player-round-stats-row"
import styles from "@/components/games/skull-king/round-score/styles/round-score.module.css"
import { getRoundEventDisplay } from "@/lib/games/skull-king/round-score/round-event-display"
import type { PlayerRoundData } from "@/lib/games/skull-king/round-score/types"

export type PlayerScoreRowProps = {
  rank: number
  playerName: string
  isRoundStarter?: boolean
  /** Running total (finalized rounds only). Shown in Total column when voyage points are used. */
  voyagePoints: { thisRound: number | null; total: number }
  roundPlayer: PlayerRoundData
  maxTricks: number
  /** All crew names, same order as config (for event tooltips). */
  allPlayerNames: readonly string[]
  /** Config index of this row’s player (for per-row event labels, e.g. alliance ally seat). */
  playerIndex: number
}

export function PlayerScoreRow({
  rank,
  playerName,
  isRoundStarter = false,
  voyagePoints,
  roundPlayer,
  maxTricks,
  allPlayerNames,
  playerIndex,
}: PlayerScoreRowProps) {
  const eventsSlot =
    roundPlayer.events.length === 0 ? (
      <span className={styles.eventsEmpty}>No events</span>
    ) : (
      roundPlayer.events.map((e, i) => {
        const d = getRoundEventDisplay(e, allPlayerNames, playerIndex)
        return (
          <EventBadge
            key={i}
            badgeKind={d.badgeKind}
            label={d.label}
            title={d.title}
            fourteenSuit={d.fourteenSuit}
          />
        )
      })
    )

  return (
    <PlayerRoundStatsRow
      rank={rank}
      playerName={playerName}
      isRoundStarter={isRoundStarter}
      voyagePoints={voyagePoints}
      bid={roundPlayer.bid}
      won={roundPlayer.won}
      maxTricks={maxTricks}
      editableBid={false}
      editableWon={false}
      eventsSlot={eventsSlot}
      harryGiantBidDelta={roundPlayer.harryGiantBidDelta}
      showWon={false}
    />
  )
}
