"use client"

import { Button } from "@/components/ui/button"
import styles from "@/components/games/skull-king/round-score/styles/round-score.module.css"
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M12.5 15 7.5 10l5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="m7.5 15 5-5-5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function VoyageNavigator() {
  const config = useRoundScoreStore((s) => s.config)
  const currentRoundIndex = useRoundScoreStore((s) => s.currentRoundIndex)
  const highestUnlockedRoundIndex = useRoundScoreStore((s) => s.highestUnlockedRoundIndex)
  const rounds = useRoundScoreStore((s) => s.rounds)
  const prevRound = useRoundScoreStore((s) => s.prevRound)
  const nextRound = useRoundScoreStore((s) => s.nextRound)

  if (!config || rounds.length === 0) return null

  const total = rounds.length
  const handSize = config.roundsSchema[currentRoundIndex] ?? 0
  const roundOrdinal = currentRoundIndex + 1
  const cardsLabel = handSize === 1 ? "card" : "cards"
  const atFirst = currentRoundIndex <= 0
  /** No further right in the strip until the next round is opened from the finish flow. */
  const atRightLimit = currentRoundIndex >= highestUnlockedRoundIndex

  return (
    <header className={styles.navigator}>
      <div className={styles.navigatorInner}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous round"
          disabled={atFirst}
          onClick={() => prevRound()}
        >
          <ChevronLeft className="text-muted-foreground" />
        </Button>
        <div className={styles.navigatorLabel}>
          <div className={styles.handSizeGroup}>
            <p className={styles.handSizeValue}>{handSize}</p>
            <p className={styles.handSizeCaption}>
              {cardsLabel} each
            </p>
          </div>
          <hr className={styles.navigatorDivider} aria-hidden />
          <p className={styles.roundMeta}>
            Round {roundOrdinal} of {total}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next round"
          title={atRightLimit ? "Next round opens when you continue from a completed round" : undefined}
          disabled={atRightLimit}
          onClick={() => nextRound()}
        >
          <ChevronRight className="text-muted-foreground" />
        </Button>
      </div>
    </header>
  )
}
