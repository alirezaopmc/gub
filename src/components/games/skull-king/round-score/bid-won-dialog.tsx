"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { CrewRoundStatsTable } from "@/components/games/skull-king/round-score/table/crew-round-stats-table"
import addStyles from "@/components/games/skull-king/round-score/styles/event-dialog.module.css"
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"
import type { BidWonModalRoundSnapshot, RoundData } from "@/lib/games/skull-king/round-score/types"
import {
  areAllNamedPlayersBidsSet,
  areAllNamedPlayersWonSet,
} from "@/lib/games/skull-king/round-score/named-player-inputs-complete"

function createBidWonModalSnapshot(round: RoundData): BidWonModalRoundSnapshot {
  return {
    finalized: round.finalized === true,
    bidsSheetDismissed: round.bidsSheetDismissed === true,
    players: round.players.map((p) => ({
      bid: p.bid,
      won: p.won,
      harryGiantBidDelta: p.harryGiantBidDelta,
      score: p.score,
    })),
  }
}

type BidWonDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fired when the user confirms via Done (not Cancel / overlay / Escape). */
  onDone?: () => void
  editableBid: boolean
  editableWon: boolean
  /** e.g. round-start, post-finish, or user-opened (both) */
  variant?: "bids" | "tricks" | "full"
}

function bidWonTitle(variant: BidWonDialogProps["variant"]): string {
  switch (variant) {
    case "bids":
      return "Bids"
    case "tricks":
      return "Tricks won"
    default:
      return "Bid / won"
  }
}

function bidWonDescription(variant: BidWonDialogProps["variant"]): string {
  switch (variant) {
    case "bids":
      return "Change bids only. The won column shows ? (read-only) until the round is tallied; after tally, use Tricks to edit bid and won if needed."
    case "tricks":
      return "Enter tricks won for this hand. When everyone’s totals are in, close here and tap Finalize on the footer to lock scores and continue."
    default:
      return "Edit bids and tricks won for this round."
  }
}

export function BidWonDialog({
  open,
  onOpenChange,
  onDone,
  editableBid,
  editableWon,
  variant = "full",
}: BidWonDialogProps) {
  const idDesc = "bid-won-dialog-desc"
  const config = useRoundScoreStore((s) => s.config)
  const rounds = useRoundScoreStore((s) => s.rounds)
  const currentRoundIndex = useRoundScoreStore((s) => s.currentRoundIndex)
  const restoreCurrentRoundFromBidWonModalSnapshot = useRoundScoreStore(
    (s) => s.restoreCurrentRoundFromBidWonModalSnapshot
  )

  const snapshotRef = React.useRef<BidWonModalRoundSnapshot | null>(null)
  const closedViaDoneRef = React.useRef(false)

  React.useLayoutEffect(() => {
    if (!open) return
    const { rounds: r, currentRoundIndex: ri } = useRoundScoreStore.getState()
    const round = r[ri]
    snapshotRef.current = round ? createBidWonModalSnapshot(round) : null
  }, [open, currentRoundIndex])

  const handleDialogOpenChange = (next: boolean) => {
    if (!next && !closedViaDoneRef.current && snapshotRef.current) {
      restoreCurrentRoundFromBidWonModalSnapshot(snapshotRef.current)
    }
    if (!next) closedViaDoneRef.current = false
    onOpenChange(next)
  }

  const allBidsSet =
    !config || rounds.length === 0 ? true : areAllNamedPlayersBidsSet(config, rounds[currentRoundIndex])

  const allWonSet =
    !config || rounds.length === 0 ? true : areAllNamedPlayersWonSet(config, rounds[currentRoundIndex])

  const doneDisabled =
    (editableBid && !allBidsSet) || (editableWon && !allWonSet)
  const doneDisabledTitle = !doneDisabled
    ? undefined
    : [
        editableBid && !allBidsSet ? "Enter every named player’s bid" : null,
        editableWon && !allWonSet ? "Enter tricks won for every named player" : null,
      ]
        .filter(Boolean)
        .join(" · ")

  return (
    <Dialog.Root open={open} onOpenChange={handleDialogOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content
          aria-describedby={idDesc}
          onOpenAutoFocus={(e) => {
            if (variant !== "tricks" || !editableWon) return
            e.preventDefault()
          }}
        >
          <Dialog.Title>{bidWonTitle(variant)}</Dialog.Title>
          <Dialog.Description id={idDesc}>
            {bidWonDescription(variant)}
          </Dialog.Description>
          <form
            className={addStyles.formSubmitDisplayContents}
            onSubmit={(e) => {
              e.preventDefault()
              if ((editableBid && !allBidsSet) || (editableWon && !allWonSet)) return
              closedViaDoneRef.current = true
              onDone?.()
              handleDialogOpenChange(false)
            }}
          >
            <div className={addStyles.body}>
              <CrewRoundStatsTable
                editableBid={editableBid}
                editableWon={editableWon}
                alwaysShowWonColumn
                showRoundScoreColumn={false}
                plainNameColumn
                autoFocusFirstWon={variant === "tricks"}
              />
            </div>
            <Dialog.Footer>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={doneDisabled}
                title={doneDisabledTitle}
              >
                Done
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
