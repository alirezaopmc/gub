"use client"

import type { ReactNode } from "react"

import { RoundPhaseLayout } from "@/components/games/skull-king/round-score/round-phase-layout"
import { CrewRoundStatsTable } from "@/components/games/skull-king/round-score/table/crew-round-stats-table"

export type RoundStatsPhaseViewProps = {
  editableBid: boolean
  editableWon: boolean
  footer: ReactNode
}

export function RoundStatsPhaseView({ editableBid, editableWon, footer }: RoundStatsPhaseViewProps) {
  return (
    <RoundPhaseLayout footer={footer}>
      <CrewRoundStatsTable editableBid={editableBid} editableWon={editableWon} />
    </RoundPhaseLayout>
  )
}
