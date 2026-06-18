"use client"

import * as React from "react"

import { nameEqualityKey } from "@/lib/games/skull-king/crew-name-validation"
import { cumulativeScoreForPlayer } from "@/lib/games/skull-king/round-score/round-helpers"
import type { RoundData } from "@/lib/games/skull-king/round-score/types"

import { cn } from "@/lib/utils"

import styles from "@/components/games/skull-king/round-score/styles/stats-table.module.css"

type RowModel = {
  playerIndex: number
  name: string
  numericTotal: number
  scoreDisplay: string
  place: number
}

type TieGroup = {
  place: number
  numericTotal: number
  scoreDisplay: string
  members: readonly { playerIndex: number; name: string }[]
}

function groupScoreTies(rows: RowModel[]): TieGroup[] {
  const groups: TieGroup[] = []
  for (const row of rows) {
    const last = groups.at(-1)
    if (last && last.numericTotal === row.numericTotal) {
      groups[groups.length - 1] = {
        ...last,
        members: [...last.members, { playerIndex: row.playerIndex, name: row.name }],
      }
    } else {
      groups.push({
        place: row.place,
        numericTotal: row.numericTotal,
        scoreDisplay: row.scoreDisplay,
        members: [{ playerIndex: row.playerIndex, name: row.name }],
      })
    }
  }
  return groups
}

export type ActiveRoundStatsVariant = "active" | "complete"

export type ActiveRoundStatsTableProps = {
  players: readonly string[]
  rounds: readonly RoundData[]
  variant?: ActiveRoundStatsVariant
}

/** Dense ranks: tied players share a place; the next place is +1 (no skipped numbers after ties). */
function competitionPlaces(sortedRows: RowModel[]): RowModel[] {
  let currentPlace = 1
  return sortedRows.map((row, i) => {
    if (i > 0 && row.numericTotal < sortedRows[i - 1]!.numericTotal) {
      currentPlace += 1
    }
    return { ...row, place: currentPlace }
  })
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

function medalForPlace(place: number): string | null {
  if (place === 1) return "🥇"
  if (place === 2) return "🥈"
  if (place === 3) return "🥉"
  return null
}

export function ActiveRoundStatsTable({
  players,
  rounds,
  variant = "active",
}: ActiveRoundStatsTableProps) {
  const leaderboard = React.useMemo(() => {
    const namedIndices = players
      .map((p, i) => (nameEqualityKey(p) !== "" ? i : null))
      .filter((i): i is number => i !== null)

    const throughLast = Math.max(0, rounds.length - 1)

    const rows: RowModel[] = namedIndices.map((playerIndex) => {
      const total = cumulativeScoreForPlayer(rounds, throughLast, playerIndex)
      return {
        playerIndex,
        name: players[playerIndex]?.trim() ?? "",
        numericTotal: total,
        scoreDisplay: String(total),
        place: 0,
      }
    })

    rows.sort((a, b) => {
      if (b.numericTotal !== a.numericTotal) return b.numericTotal - a.numericTotal
      return a.playerIndex - b.playerIndex
    })

    return groupScoreTies(competitionPlaces(rows))
  }, [players, rounds])

  if (leaderboard.length === 0) {
    return (
      <p className={styles.empty} role="status">
        No crew to show.
      </p>
    )
  }

  const rankHeader = variant === "complete" ? "Rank" : "#"

  return (
    <div className={styles.tableScroll}>
      <table
        className={styles.statsTable}
        aria-label={
          variant === "complete"
            ? "Final standings by voyage score, highest first, with podium medals"
            : "Players ranked by voyage score, highest first"
        }
      >
        <thead>
          <tr>
            <th scope="col" className={cn(styles.thPlain, styles.thCenter)}>
              {rankHeader}
            </th>
            <th scope="col" className={styles.thPlain}>
              Name
            </th>
            <th scope="col" className={cn(styles.thPlain, styles.thCenter)}>
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((group) => {
            const label = ordinalPlaceLabel(group.place)
            const medal = variant === "complete" ? medalForPlace(group.place) : null
            const tieNote =
              group.members.length > 1
                ? ` (tied: ${group.members.map((m) => m.name).join(", ")})`
                : ""
            const rankAria = `${label}${tieNote}`

            return (
              <tr key={group.members.map((m) => m.playerIndex).join("-")}>
                <td
                  className={cn(
                    styles.tdRank,
                    variant === "complete" && medal && styles.tdRankMedal,
                  )}
                  aria-label={rankAria}
                >
                  {variant === "complete" && medal ? (
                    <span aria-hidden>{medal}</span>
                  ) : (
                    group.place
                  )}
                </td>
                <td className={styles.tdName}>
                  <div className={styles.nameStack}>
                    {group.members.map((m) => (
                      <div key={m.playerIndex} className={styles.nameLine}>
                        {m.name}
                      </div>
                    ))}
                  </div>
                </td>
                <td className={styles.tdScore}>{group.scoreDisplay}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
