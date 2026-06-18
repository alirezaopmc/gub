/** Expansion / house-rule toggles for Skull King (serializable in game config). */
export enum Artifacts {
  PirateAbilities = "PirateAbilities",
  CharacterCapture = "CharacterCapture",
  Whale = "Whale",
  Kraken = "Kraken",
  Loot = "Loot",
  FourteenBonus = "FourteenBonus",
}

export const ARTIFACTS_LIST = Object.values(Artifacts) as Artifacts[]

export type ArtifactPresetId = "beginner" | "intermediate" | "expert"

export const ARTIFACT_PRESET_IDS: readonly ArtifactPresetId[] = [
  "beginner",
  "intermediate",
  "expert",
] as const

function emptyArtifactOptions(): Record<Artifacts, boolean> {
  return {
    [Artifacts.PirateAbilities]: false,
    [Artifacts.CharacterCapture]: false,
    [Artifacts.Whale]: false,
    [Artifacts.Kraken]: false,
    [Artifacts.Loot]: false,
    [Artifacts.FourteenBonus]: false,
  }
}

/** Bulk preset maps for the Artifacts setup section. */
export function artifactOptionsForPreset(preset: ArtifactPresetId): Record<Artifacts, boolean> {
  switch (preset) {
    case "beginner":
      return emptyArtifactOptions()
    case "intermediate":
      return {
        ...emptyArtifactOptions(),
        [Artifacts.Whale]: true,
        [Artifacts.Kraken]: true,
        [Artifacts.Loot]: true,
      }
    case "expert":
      return {
        [Artifacts.PirateAbilities]: true,
        [Artifacts.CharacterCapture]: true,
        [Artifacts.Whale]: true,
        [Artifacts.Kraken]: true,
        [Artifacts.Loot]: true,
        [Artifacts.FourteenBonus]: true,
      }
  }
}

/**
 * Baseline artifact map for merges and SSR (equivalent to {@link artifactOptionsForPreset} `"expert"`).
 * Prefer {@link getDefaultArtifactOptionsForNewGame} from `game-config-storage` for new setup sessions
 * so the host’s last choices can apply on the client.
 */
export function createInitialArtifactOptions(): Record<Artifacts, boolean> {
  return artifactOptionsForPreset("expert")
}

export function artifactOptionsMatchPreset(
  options: Record<Artifacts, boolean>,
  preset: ArtifactPresetId
): boolean {
  const target = artifactOptionsForPreset(preset)
  return ARTIFACTS_LIST.every((k) => options[k] === target[k])
}

export function matchArtifactPreset(options: Record<Artifacts, boolean>): ArtifactPresetId | null {
  for (const id of ARTIFACT_PRESET_IDS) {
    if (artifactOptionsMatchPreset(options, id)) return id
  }
  return null
}
