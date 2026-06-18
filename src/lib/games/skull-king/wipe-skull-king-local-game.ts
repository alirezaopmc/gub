import { clearGameConfig } from "@/lib/games/skull-king/game-config-storage"
import { resetVoyageStorage } from "@/lib/games/skull-king/reset-voyage-storage"
import { useSkullKingStore } from "@/lib/games/skull-king/skull-king-store"

/** Clears saved config, voyage progress, score session, and in-memory setup. */
export function wipeSkullKingLocalGame(): void {
  clearGameConfig()
  resetVoyageStorage()
  useSkullKingStore.getState().resetToInitialSetup()
}
