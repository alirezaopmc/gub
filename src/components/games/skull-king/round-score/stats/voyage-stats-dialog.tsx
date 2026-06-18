"use client"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"

import { ActiveRoundStatsTable } from "@/components/games/skull-king/round-score/stats/active-round-stats-table"
import dialogBody from "@/components/games/skull-king/round-score/styles/stats-dialog.module.css"

const idDesc = "voyage-stats-dialog-desc"

export type VoyageStatsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VoyageStatsDialog({ open, onOpenChange }: VoyageStatsDialogProps) {
  const config = useRoundScoreStore((s) => s.config)
  const rounds = useRoundScoreStore((s) => s.rounds)

  const voyageFinished = rounds.length > 0 && rounds.every((r) => r.finalized)
  const variant = voyageFinished ? "complete" : "active"

  const table =
    config != null && rounds.length > 0 ? (
      <ActiveRoundStatsTable players={config.players} rounds={rounds} variant={variant} />
    ) : null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content aria-describedby={idDesc}>
          <Dialog.Title>
            {voyageFinished ? "Voyage complete" : "Voyage stats"}
          </Dialog.Title>
          <Dialog.Description id={idDesc}>
            {voyageFinished
              ? "Final standings: podium medals for the top three ranks (ties share a rank). Highest total score first."
              : "Total points per crew member from every finalized round so far, listed highest score first."}
          </Dialog.Description>
          <div className={dialogBody.body}>{table}</div>
          <Dialog.Footer className="justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
