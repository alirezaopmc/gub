import type { ComponentType } from "react"

import { Artifacts } from "@/lib/games/skull-king/artifacts"
import {
  CoinExpansionIcon,
  FourteenBonusIcon,
  HeroCaptureIcon,
  KrakenIcon,
  PirateAbilitiesIcon,
  WhaleIcon,
} from "@/components/games/skull-king/setup/artifacts/cursed-artifact-icons"

export type ArtifactRowConfig = {
  id: Artifacts
  label: string
  Icon: ComponentType<{ className?: string }>
}

export const ARTIFACT_ROWS: ArtifactRowConfig[] = [
  { id: Artifacts.Loot, label: "Loot", Icon: CoinExpansionIcon },
  { id: Artifacts.Kraken, label: "Kraken", Icon: KrakenIcon },
  { id: Artifacts.Whale, label: "Whale", Icon: WhaleIcon },
  { id: Artifacts.FourteenBonus, label: "Bonus", Icon: FourteenBonusIcon },
  { id: Artifacts.CharacterCapture, label: "Capture", Icon: HeroCaptureIcon },
  { id: Artifacts.PirateAbilities, label: "Abilities", Icon: PirateAbilitiesIcon },
]
