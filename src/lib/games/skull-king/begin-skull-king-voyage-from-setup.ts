import { crewRowNames } from "@/lib/games/skull-king/crew-row"
import { saveGameConfig, saveLastArtifactOptions } from "@/lib/games/skull-king/game-config-storage"
import { resetVoyageStorage } from "@/lib/games/skull-king/reset-voyage-storage"
import { getSetupStartBlocker } from "@/lib/games/skull-king/setup-ready"
import { useSkullKingStore } from "@/lib/games/skull-king/skull-king-store"

/** Saves config, resets voyage storage, and syncs artifact prefs when setup passes start gates. */
export function beginSkullKingVoyageFromSetupIfReady(): boolean {
  const { players, roundsSchema, getGameConfig } = useSkullKingStore.getState()
  const names = crewRowNames(players)
  if (getSetupStartBlocker(names, roundsSchema) !== null) return false
  resetVoyageStorage()
  const config = getGameConfig()
  saveLastArtifactOptions(config.options)
  saveGameConfig(config)
  return true
}
