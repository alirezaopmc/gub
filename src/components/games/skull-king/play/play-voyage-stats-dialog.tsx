"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import dialogBody from "@/components/games/skull-king/round-score/styles/stats-dialog.module.css"
import tableStyles from "@/components/games/skull-king/round-score/styles/stats-table.module.css"
import type { PublicMatchView } from "@/lib/games/skull-king/session/match-store"
import { cn } from "@/lib/utils"

const idDesc = "play-voyage-stats-desc"

type StandingsRow = {
  seatIndex: number
  name: string
  score: number
  place: number
}

function medalForPlace(place: number): string | null {
  if (place === 1) return "🥇"
  if (place === 2) return "🥈"
  if (place === 3) return "🥉"
  return null
}

function ordinalPlaceLabel(place: number): string {
  const n = place % 100
  if (n >= 11 && n <= 13) return `${place}th place`
  switch (place % 10) {
    case 1:
      return `${place}st place`
    case 2:
      return `${place}nd place`
    case 3:
      return `${place}rd place`
    default:
      return `${place}th place`
  }
}

function buildStandings(view: PublicMatchView): StandingsRow[] {
  const scores =
    view.round?.phase === "scoring" ? view.provisionalScores : view.cumulativeScores

  const rows = view.players.map((p, i) => ({
    seatIndex: p.seatIndex,
    name: p.displayName,
    score: scores[i] ?? 0,
    place: 0,
  }))

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.seatIndex - b.seatIndex
  })

  let currentPlace = 1
  return rows.map((row, i) => {
    if (i > 0 && row.score < rows[i - 1]!.score) {
      currentPlace += 1
    }
    return { ...row, place: currentPlace }
  })
}

function groupTies(rows: StandingsRow[]) {
  const groups: Array<{ place: number; score: number; members: StandingsRow[] }> = []
  for (const row of rows) {
    const last = groups.at(-1)
    if (last && last.score === row.score) {
      last.members.push(row)
    } else {
      groups.push({ place: row.place, score: row.score, members: [row] })
    }
  }
  return groups
}

export type PlayVoyageStatsDialogProps = {
  view: PublicMatchView
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlayVoyageStatsDialog({ view, open, onOpenChange }: PlayVoyageStatsDialogProps) {
  const variant = view.phase === "game_over" ? "complete" : "active"
  const standings = React.useMemo(() => groupTies(buildStandings(view)), [view])
  const rankHeader = variant === "complete" ? "Rank" : "#"

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content aria-describedby={idDesc}>
          <Dialog.Title>
            {variant === "complete" ? "Voyage complete" : "Voyage standings"}
          </Dialog.Title>
          <Dialog.Description id={idDesc}>
            {variant === "complete"
              ? "Final standings — highest total score wins. Ties share rank."
              : "Running totals for each player, highest score first."}
          </Dialog.Description>
          <div className={dialogBody.body}>
            {standings.length === 0 ? (
              <p className={tableStyles.empty} role="status">
                No scores yet.
              </p>
            ) : (
              <div className={tableStyles.tableScroll}>
                <table
                  className={tableStyles.statsTable}
                  aria-label="Voyage standings by total score"
                >
                  <thead>
                    <tr>
                      <th scope="col" className={cn(tableStyles.thPlain, tableStyles.thCenter)}>
                        {rankHeader}
                      </th>
                      <th scope="col" className={tableStyles.thPlain}>
                        Name
                      </th>
                      <th scope="col" className={cn(tableStyles.thPlain, tableStyles.thCenter)}>
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((group) => {
                      const medal =
                        variant === "complete" ? medalForPlace(group.place) : null
                      const label = ordinalPlaceLabel(group.place)
                      return (
                        <tr key={group.members.map((m) => m.seatIndex).join("-")}>
                          <td
                            className={cn(
                              tableStyles.tdRank,
                              variant === "complete" && medal && tableStyles.tdRankMedal,
                            )}
                            aria-label={label}
                          >
                            {medal ?? group.place}
                          </td>
                          <td className={tableStyles.tdName}>
                            <div className={tableStyles.nameStack}>
                              {group.members.map((m) => (
                                <div key={m.seatIndex} className={tableStyles.nameLine}>
                                  {m.name}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className={tableStyles.tdScore}>{group.score}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
