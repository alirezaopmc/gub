import { getRoundEventDisplay } from "@/lib/games/skull-king/round-score/round-event-display"
import type { RoundData, RoundEvent } from "@/lib/games/skull-king/round-score/types"

export type RoundEventLogRemoval =
  | { kind: "single"; playerIndex: number; eventIndex: number }
  | { kind: "alliance"; lootPlayerIndex: number; trickWinnerIndex: number }

export type RoundEventLogEntry = {
  key: string
  /** Monotonic when present; used with tie-break for legacy rows. */
  sortTie: number
  title: string
  removal: RoundEventLogRemoval
}

/**
 * All logged events in the round, one line each (alliance is deduped — one row per pair).
 * Sorted by `loggedAt` when set; otherwise by stable fallback (player order + slot index).
 */
export function getRoundEventLogEntries(
  round: RoundData,
  playerNames: readonly string[],
): RoundEventLogEntry[] {
  const items: { event: RoundEvent; playerIndex: number; eventIndex: number; tie: number; sortKey: number }[] = []
  let tie = 0
  const seenAlliance = new Set<string>()

  for (let playerIndex = 0; playerIndex < round.players.length; playerIndex++) {
    const evs = round.players[playerIndex]!.events
    for (let eventIndex = 0; eventIndex < evs.length; eventIndex++) {
      const event = evs[eventIndex]!
      if (event.type === "alliance") {
        const a = event.lootPlayerIndex
        const b = event.trickWinnerIndex
        const k = a <= b ? `${a}:${b}` : `${b}:${a}`
        if (seenAlliance.has(k)) continue
        seenAlliance.add(k)
      }
      const loggedAt = event.loggedAt
      const fallback = playerIndex * 10_000 + eventIndex
      const sortKey = loggedAt != null && Number.isFinite(loggedAt) ? loggedAt : fallback
      tie += 1
      items.push({ event, playerIndex, eventIndex, tie, sortKey })
    }
  }

  items.sort(
    (x, y) =>
      x.sortKey - y.sortKey || x.playerIndex - y.playerIndex || x.eventIndex - y.eventIndex,
  )

  return items.map(({ event, playerIndex, eventIndex, tie: sortTie }) => {
    const d = getRoundEventDisplay(event, playerNames, playerIndex)
    const removal: RoundEventLogRemoval =
      event.type === "alliance"
        ? {
            kind: "alliance",
            lootPlayerIndex: event.lootPlayerIndex,
            trickWinnerIndex: event.trickWinnerIndex,
          }
        : { kind: "single", playerIndex, eventIndex }
    return {
      key: `${playerIndex}-${sortTie}-${d.title}`,
      sortTie,
      title: d.title,
      removal,
    }
  })
}
