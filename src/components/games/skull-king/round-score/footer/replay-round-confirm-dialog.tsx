"use client"

import * as React from "react"

import { HoldToConfirmErase } from "@/components/games/skull-king/entry/hold-to-confirm-erase"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { EphemeralToast } from "@/components/ui/ephemeral-toast"

const idDesc = "replay-round-confirm-desc"

const TOAST_HOLD_HINT = "Press and hold"

const TOAST_MS = 4500

export type ReplayRoundConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  roundNumber: number
  onConfirm: () => void
}

export function ReplayRoundConfirmDialog({
  open,
  onOpenChange,
  roundNumber,
  onConfirm,
}: ReplayRoundConfirmDialogProps) {
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!toastMessage) return
    const id = window.setTimeout(() => setToastMessage(null), TOAST_MS)
    return () => window.clearTimeout(id)
  }, [toastMessage])

  React.useEffect(() => {
    if (!open) setToastMessage(null)
  }, [open])

  const handleReplayHoldConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <>
      <EphemeralToast message={toastMessage} variant="warning" />
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content aria-describedby={idDesc}>
            <Dialog.Title>Redo round {roundNumber}?</Dialog.Title>
            <Dialog.Description id={idDesc}>
              This clears bids, tricks won, scores, and events for this round and every later round on this
              voyage. You still move forward from here using Start / Finish / Finalize as usual.
            </Dialog.Description>
            <div className="flex min-w-0 flex-col gap-3 border-t border-border/25 pt-3">
              <HoldToConfirmErase
                variant="caution"
                size="lg"
                labelIdle="Redo"
                ariaDescription={`Redo round ${roundNumber}. This clears bids, tricks won, scores, and events for this round and every later round on this voyage.`}
                shortTapOutcomeSr="A quick tap will not redo the round."
                onConfirm={handleReplayHoldConfirm}
                onShortTapHint={() => setToastMessage(TOAST_HOLD_HINT)}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
