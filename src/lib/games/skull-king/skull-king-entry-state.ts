import { loadGameConfig } from "@/lib/games/skull-king/game-config-storage"
import { loadRoundData } from "@/lib/games/skull-king/round-score/round-data-storage"

export type SkullKingEntryState =
  | { kind: "ongoing"; currentRoundIndex: number; roundCount: number }
  | { kind: "readyToStart" }
  | { kind: "fresh" }

/**
 * Derives entry flow from local persistence. Round data wins over game config
 * (ongoing voyage vs committed config only).
 */
export function getSkullKingEntryState(): SkullKingEntryState {
  const roundData = loadRoundData()
  if (roundData) {
    return {
      kind: "ongoing",
      currentRoundIndex: roundData.currentRoundIndex,
      roundCount: roundData.roundCount,
    }
  }
  if (loadGameConfig()) {
    return { kind: "readyToStart" }
  }
  return { kind: "fresh" }
}
