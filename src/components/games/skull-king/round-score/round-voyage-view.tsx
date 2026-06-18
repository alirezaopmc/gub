"use client"

import * as React from "react"

import { RoundVoyageFooter } from "@/components/games/skull-king/round-score/footer/round-voyage-footer"
import { RoundScoreBodyMotion } from "@/components/games/skull-king/round-score/round-body-motion"
import { RoundPhaseLayout } from "@/components/games/skull-king/round-score/round-phase-layout"
import { VoyageStatsDialog } from "@/components/games/skull-king/round-score/stats/voyage-stats-dialog"
import { CrewRoundStatsTable } from "@/components/games/skull-king/round-score/table/crew-round-stats-table"
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"

function voyageAllFinalized(rounds: readonly { finalized: boolean }[]): boolean {
  return rounds.length > 0 && rounds.every((r) => r.finalized)
}

/** Single host screen per round: read-only table on the page; bid/won and events live in modals. */
export function RoundVoyageView() {
  const [statsOpen, setStatsOpen] = React.useState(false)
  const rounds = useRoundScoreStore((s) => s.rounds)
  const currentRoundIndex = useRoundScoreStore((s) => s.currentRoundIndex)

  const voyageCompletePrevRef = React.useRef<boolean | null>(null)

  React.useEffect(() => {
    const complete = voyageAllFinalized(rounds)
    const prev = voyageCompletePrevRef.current
    voyageCompletePrevRef.current = complete
    if (prev !== null && !prev && complete) {
      setStatsOpen(true)
    }
  }, [rounds])

  return (
    <>
      <RoundPhaseLayout
        footer={
          <RoundVoyageFooter
            statsDialogOpen={statsOpen}
            onOpenStats={() => setStatsOpen(true)}
          />
        }
      >
        <RoundScoreBodyMotion roundIndex={currentRoundIndex}>
          <CrewRoundStatsTable editableBid={false} editableWon={false} />
        </RoundScoreBodyMotion>
      </RoundPhaseLayout>
      <VoyageStatsDialog open={statsOpen} onOpenChange={setStatsOpen} />
    </>
  )
}
