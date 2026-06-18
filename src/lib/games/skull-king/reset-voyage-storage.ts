import { clearRoundData } from "@/lib/games/skull-king/round-score/round-data-storage"
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"

/** Drops persisted round/voyage progress and the in-memory score session (new game from setup). */
export function resetVoyageStorage(): void {
  clearRoundData()
  useRoundScoreStore.getState().resetSession()
}
