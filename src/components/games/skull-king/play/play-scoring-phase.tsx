"use client"

import { Button } from "@/components/ui/button"

import {
  currentRoundSummary,
  PlayRoundResultsTable,
} from "@/components/games/skull-king/play/play-round-results-table"
import type { PublicMatchView } from "@/lib/games/skull-king/session/match-store"

function playerName(view: PublicMatchView, seat: number): string {
  return view.players.find((p) => p.seatIndex === seat)?.displayName ?? `Player ${seat + 1}`
}

function hostName(view: PublicMatchView): string {
  return view.players.find((p) => p.isHost)?.displayName ?? "Host"
}

export type PlayScoringPhaseProps = {
  view: PublicMatchView
  dispatch: (action: Record<string, unknown>) => Promise<void>
  onOpenStandings: () => void
}

export function PlayScoringPhase({ view, dispatch, onOpenStandings }: PlayScoringPhaseProps) {
  const round = view.round
  const summary = currentRoundSummary(view)
  if (!round || !summary) return null

  const isFinalRound = round.roundIndex + 1 >= round.roundsTotal
  const nextRoundLabel = isFinalRound
    ? "Finish voyage"
    : `Continue to Round ${round.roundIndex + 2}`

  return (
    <section className="flex flex-col gap-4" aria-labelledby="round-complete-heading">
      <div>
        <h3 id="round-complete-heading" className="font-headline text-lg font-semibold text-primary">
          Round {round.roundIndex + 1} complete
        </h3>
        <p className="text-sm text-muted-foreground">
          Dealer: {playerName(view, round.dealerIndex)} · Led: {playerName(view, round.leaderIndex)}
        </p>
      </div>

      <PlayRoundResultsTable view={view} summary={summary} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {view.viewerIsHost && view.phase !== "game_over" ? (
          <Button
            variant="branded"
            onClick={() =>
              void dispatch({ type: "advance_round", seed: Date.now() })
            }
          >
            {nextRoundLabel}
          </Button>
        ) : view.phase !== "game_over" ? (
          <p className="text-sm text-muted-foreground">
            Review results — {hostName(view)} will continue when ready.
          </p>
        ) : null}
        <Button type="button" variant="outline" onClick={onOpenStandings}>
          Voyage standings
        </Button>
      </div>
    </section>
  )
}
