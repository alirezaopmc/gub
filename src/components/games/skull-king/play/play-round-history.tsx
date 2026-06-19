"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PlayRoundResultsTable, voyageTotalsThroughRound } from "@/components/games/skull-king/play/play-round-results-table"
import type { PublicMatchView, PublicRoundSummary } from "@/lib/games/skull-king/session/match-store"

function playerName(view: PublicMatchView, seat: number): string {
  return view.players.find((p) => p.seatIndex === seat)?.displayName ?? `Player ${seat + 1}`
}

export type PlayRoundHistoryProps = {
  view: PublicMatchView
}

export function PlayRoundHistory({ view }: PlayRoundHistoryProps) {
  const [open, setOpen] = React.useState(false)
  const [index, setIndex] = React.useState(0)

  const history = view.roundHistory
  if (history.length === 0) return null

  const safeIndex = Math.min(index, history.length - 1)
  const summary: PublicRoundSummary = history[safeIndex]!

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="font-label text-xs tracking-wide text-muted-foreground uppercase hover:text-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          Past rounds ({history.length})
        </button>
        {open ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={safeIndex <= 0}
              aria-label="Previous round"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              Round {summary.roundIndex + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={safeIndex >= history.length - 1}
              aria-label="Next round"
              onClick={() => setIndex((i) => Math.min(history.length - 1, i + 1))}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {summary.handSize} card{summary.handSize === 1 ? "" : "s"} each · Dealer:{" "}
            {playerName(view, summary.dealerIndex)} · Led:{" "}
            {playerName(view, summary.leaderIndex)}
          </p>
          <PlayRoundResultsTable
            view={view}
            summary={summary}
            totalsThroughRound={voyageTotalsThroughRound(view, summary.roundIndex)}
          />
        </div>
      ) : null}
    </section>
  )
}
