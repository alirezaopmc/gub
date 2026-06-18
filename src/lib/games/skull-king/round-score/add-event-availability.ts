import { Artifacts, createInitialArtifactOptions } from "@/lib/games/skull-king/artifacts"
import type { SkullKingGameConfig } from "@/lib/games/skull-king/skull-king-game-config"

/** What the host can add from the + Event flow (driven by setup toggles; whale/kraken never). */
export type AddableEventKind = "alliance" | "pirateAbility" | "characterCapture" | "fourteenBonus"

export function getAddableEventKinds(config: SkullKingGameConfig | null): AddableEventKind[] {
  if (!config) return []
  const o = { ...createInitialArtifactOptions(), ...config.options }
  const out: AddableEventKind[] = []
  if (o[Artifacts.Loot]) out.push("alliance")
  if (o[Artifacts.PirateAbilities]) out.push("pirateAbility")
  if (o[Artifacts.CharacterCapture]) out.push("characterCapture")
  if (o[Artifacts.FourteenBonus]) out.push("fourteenBonus")
  return out
}

export function addableEventLabel(kind: AddableEventKind): string {
  switch (kind) {
    case "alliance":
      return "Alliance"
    case "pirateAbility":
      return "Pirate ability"
    case "characterCapture":
      return "Character capture"
    case "fourteenBonus":
      return "Fourteen bonus"
    default: {
      const _e: never = kind
      return _e
    }
  }
}
