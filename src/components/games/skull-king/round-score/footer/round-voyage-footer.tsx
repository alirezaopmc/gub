"use client"

import * as React from "react"

import { BidWonDialog } from "@/components/games/skull-king/round-score/bid-won-dialog"
import { EventsDialog } from "@/components/games/skull-king/round-score/events/add-event-dialog"
import { ReplayRoundConfirmDialog } from "@/components/games/skull-king/round-score/footer/replay-round-confirm-dialog"
import { Button } from "@/components/ui/button"
import { SkullKingAnchorIcon } from "@/components/games/skull-king/setup/shared/skull-king-setup-icons"
import styles from "@/components/games/skull-king/round-score/styles/round-score.module.css"
import {
  areAllNamedPlayersBidsSet,
  areAllNamedPlayersWonSet,
} from "@/lib/games/skull-king/round-score/named-player-inputs-complete"
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"
import { BarChart3, Menu, PencilLine, RotateCcw, Wrench } from "lucide-react"

export type RoundVoyageFooterProps = {
  statsDialogOpen: boolean
  onOpenStats: () => void
}

export function RoundVoyageFooter({ statsDialogOpen, onOpenStats }: RoundVoyageFooterProps) {
  const config = useRoundScoreStore((s) => s.config)
  const currentRoundIndex = useRoundScoreStore((s) => s.currentRoundIndex)
  const rounds = useRoundScoreStore((s) => s.rounds)
  const finalizeCurrentRound = useRoundScoreStore((s) => s.finalizeCurrentRound)
  const nextRound = useRoundScoreStore((s) => s.nextRound)
  const replayFromCurrentRound = useRoundScoreStore((s) => s.replayFromCurrentRound)
  const acknowledgeBidsSheet = useRoundScoreStore((s) => s.acknowledgeBidsSheet)

  /** Tracks rounds we already initialized the bid sheet state for (by index). */
  const initializedRoundIndexRef = React.useRef<number | null>(null)

  const [bidWonOpen, setBidWonOpen] = React.useState(false)
  const [bidWonEditableBid, setBidWonEditableBid] = React.useState(true)
  const [bidWonEditableWon, setBidWonEditableWon] = React.useState(false)
  const [bidWonVariant, setBidWonVariant] = React.useState<"bids" | "tricks" | "full">("bids")
  const [eventsOpen, setEventsOpen] = React.useState(false)
  const [replayConfirmOpen, setReplayConfirmOpen] = React.useState(false)

  React.useEffect(() => {
    const round = rounds[currentRoundIndex]
    if (!round) return
    if (initializedRoundIndexRef.current === currentRoundIndex) return
    initializedRoundIndexRef.current = currentRoundIndex

    setBidWonEditableBid(true)
    setBidWonEditableWon(false)
    setBidWonVariant("bids")
    // Do not auto-open the bids sheet at round start; use the Tricks control to edit bids.
    setBidWonOpen(false)
  }, [currentRoundIndex, rounds])

  const currentRound = config && rounds.length > 0 ? rounds[currentRoundIndex] : undefined
  const allBidsSet =
    currentRound != null && config != null ? areAllNamedPlayersBidsSet(config, currentRound) : true
  const allWonSet =
    currentRound != null && config != null ? areAllNamedPlayersWonSet(config, currentRound) : true

  const roundFinalized = currentRound?.finalized === true
  const atLastRound = config && rounds.length > 0 ? currentRoundIndex >= rounds.length - 1 : false
  const primaryIsStart = !roundFinalized && !allBidsSet
  /** Bids and tricks won entered; host must tap Finalize to lock scores and go on. */
  const readyToFinalize = !roundFinalized && allBidsSet && allWonSet

  const onStartSetBids = React.useCallback(() => {
    setBidWonEditableBid(true)
    setBidWonEditableWon(false)
    setBidWonVariant("bids")
    setBidWonOpen(true)
  }, [])

  /** Open tricks won sheet only — no finalize and no auto-advance (host uses Finalize next). */
  const onFinish = React.useCallback(() => {
    setBidWonEditableBid(true)
    setBidWonEditableWon(true)
    setBidWonVariant("tricks")
    setBidWonOpen(true)
  }, [])

  const onFinalizeAndAdvance = React.useCallback(() => {
    finalizeCurrentRound()
    if (atLastRound) return
    nextRound({ allowUnlock: true })
  }, [atLastRound, finalizeCurrentRound, nextRound])

  React.useEffect(() => {
    if (typeof window === "undefined" || !config || rounds.length === 0) return
    if (roundFinalized) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.isComposing) return
      if (bidWonOpen || eventsOpen || statsDialogOpen || replayConfirmOpen) return
      if (roundFinalized) return
      const t = e.target
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement
      ) {
        return
      }
      if (t instanceof HTMLElement && t.isContentEditable) return
      if (t instanceof HTMLButtonElement) return
      if (t instanceof HTMLAnchorElement) return
      e.preventDefault()
      if (primaryIsStart) onStartSetBids()
      else if (readyToFinalize) onFinalizeAndAdvance()
      else onFinish()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    config,
    rounds.length,
    roundFinalized,
    bidWonOpen,
    eventsOpen,
    statsDialogOpen,
    replayConfirmOpen,
    primaryIsStart,
    readyToFinalize,
    onStartSetBids,
    onFinish,
    onFinalizeAndAdvance,
  ])

  if (!config || rounds.length === 0) return null

  const editTricksTitle = roundFinalized
    ? "Edit bids and tricks won (correct mistakes after tally)"
    : !allBidsSet
      ? "Set bids for this round (same as Start)"
      : "Edit bids only — enter tricks won with Finish"

  return (
    <footer className={styles.footer}>
      <div className={styles.footerGroup}>
        <div className={styles.footerAction}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!allBidsSet}
            aria-label={
              allBidsSet
                ? "Events log"
                : "Events log unavailable — set all crew bids to start this round first"
            }
            title={
              allBidsSet ? "View this round’s event log" : "Set every crew member’s bid (tap Start), then events can be logged"
            }
            onClick={() => setEventsOpen(true)}
          >
            <Menu className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>
          <span className={styles.footerLabel}>Events</span>
        </div>
        <div className={styles.footerAction}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              roundFinalized ? "Edit bid and tricks won" : "Edit bids for this round"
            }
            title={editTricksTitle}
            onClick={() => {
              if (roundFinalized) {
                setBidWonEditableBid(true)
                setBidWonEditableWon(true)
                setBidWonVariant("full")
              } else {
                setBidWonEditableBid(true)
                setBidWonEditableWon(false)
                setBidWonVariant("bids")
              }
              setBidWonOpen(true)
            }}
          >
            <PencilLine className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>
          <span className={styles.footerLabel}>Tricks</span>
        </div>
      </div>

      <div className={styles.footerActionMain}>
        {roundFinalized ? (
          <Button
            type="button"
            variant="outlineReplay"
            size="cta"
            className="w-full font-headline tracking-[0.06em] font-bold"
            aria-label={`Redo round ${currentRoundIndex + 1} — clears scores for this deal and later rounds`}
            onClick={() => setReplayConfirmOpen(true)}
          >
            <span className={styles.footerPrimaryCtaRow}>
              <RotateCcw className="size-4 opacity-95" aria-hidden strokeWidth={1.5} />
              Redo
            </span>
            <span className={styles.footerPrimaryCtaKicker}>This round</span>
          </Button>
        ) : readyToFinalize ? (
          <Button
            type="button"
            variant="default"
            size="cta"
            className="w-full font-headline tracking-[0.06em] font-bold"
            aria-label={
              atLastRound
                ? "Finalize this round and end the voyage"
                : "Finalize this round and go to the next deal"
            }
            onClick={onFinalizeAndAdvance}
          >
            <span className={styles.footerPrimaryCtaRow}>
              <SkullKingAnchorIcon className="size-4 opacity-95" />
              Finalize
            </span>
            <span className={styles.footerPrimaryCtaKicker}>
              {atLastRound ? "End voyage" : "Next Round"}
            </span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            size="cta"
            className="w-full font-headline tracking-[0.06em] font-bold"
            aria-label={
              primaryIsStart
                ? "Set bid tricks for this hand"
                : "Set tricks won for this hand (finalize from the footer when ready)"
            }
            onClick={primaryIsStart ? onStartSetBids : onFinish}
          >
            <span className={styles.footerPrimaryCtaRow}>
              <SkullKingAnchorIcon className="size-4 opacity-95" />
              {primaryIsStart ? "Start" : "Finish"}
            </span>
            <span className={styles.footerPrimaryCtaKicker}>
              {primaryIsStart ? "Set Bid Tricks" : "Set Won Tricks"}
            </span>
          </Button>
        )}
      </div>

      <div className={styles.footerGroup}>
        <div className={styles.footerAction}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label="Game config — coming soon"
            title="Game config — coming soon"
          >
            <Wrench className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>
          <span className={styles.footerLabel}>Config</span>
        </div>
        <div className={styles.footerAction}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Voyage stats — crew ranked by total points, highest first"
            title="View voyage totals (highest score first)"
            onClick={onOpenStats}
          >
            <BarChart3 className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>
          <span className={styles.footerLabel}>Stats</span>
        </div>
      </div>

      <BidWonDialog
        open={bidWonOpen}
        onOpenChange={setBidWonOpen}
        onDone={
          bidWonVariant === "bids"
            ? () => {
                acknowledgeBidsSheet()
              }
            : undefined
        }
        editableBid={bidWonEditableBid}
        editableWon={bidWonEditableWon}
        variant={bidWonVariant}
      />
      <EventsDialog open={eventsOpen} onOpenChange={setEventsOpen} />
      <ReplayRoundConfirmDialog
        open={replayConfirmOpen}
        onOpenChange={setReplayConfirmOpen}
        roundNumber={currentRoundIndex + 1}
        onConfirm={() => {
          initializedRoundIndexRef.current = null
          replayFromCurrentRound()
          setBidWonOpen(false)
          setEventsOpen(false)
        }}
      />
    </footer>
  )
}
