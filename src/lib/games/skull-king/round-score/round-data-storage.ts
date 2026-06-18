import { parsePersistedRounds } from "@/lib/games/skull-king/round-score/parse-persisted-rounds"
import type { RoundData } from "@/lib/games/skull-king/round-score/types"

const STORAGE_KEY = "skull-king:round-data"

export type PersistedRoundState = {
  v: 1
  playerCount: number
  roundCount: number
  currentRoundIndex: number
  /** Max round index the voyage may navigate to (0-based); advances when the host finishes a round. */
  highestUnlockedRoundIndex: number
  rounds: RoundData[]
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x)
}

function isRoundDataArray(x: unknown): x is unknown[] {
  return Array.isArray(x)
}

function clampUnlocked(roundCount: number, currentRoundIndex: number, hi: number): number {
  return Math.max(0, Math.min(roundCount - 1, Math.max(currentRoundIndex, hi)))
}

export function loadRoundData(): PersistedRoundState | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === null || raw === "") return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  if (parsed.v !== 1) return null

  const playerCount = parsed.playerCount
  const roundCount = parsed.roundCount
  const currentRoundIndex = parsed.currentRoundIndex
  const rounds = parsed.rounds
  if (typeof playerCount !== "number" || typeof roundCount !== "number") return null
  if (typeof currentRoundIndex !== "number") return null
  if (!isRoundDataArray(rounds)) return null
  if (rounds.length !== roundCount) return null
  for (const round of rounds) {
    if (!round || typeof round !== "object" || !("players" in round)) return null
    const pl = (round as { players: unknown }).players
    if (!Array.isArray(pl) || pl.length !== playerCount) return null
  }

  if (typeof parsed.highestUnlockedRoundIndex !== "number" || !Number.isFinite(parsed.highestUnlockedRoundIndex)) {
    return null
  }
  const highestUnlockedRoundIndex = clampUnlocked(
    roundCount,
    currentRoundIndex,
    parsed.highestUnlockedRoundIndex,
  )
  return {
    v: 1,
    playerCount,
    roundCount,
    currentRoundIndex,
    highestUnlockedRoundIndex,
    rounds: parsePersistedRounds(rounds),
  }
}

export function saveRoundData(state: PersistedRoundState): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearRoundData(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}
