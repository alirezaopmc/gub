import type { Artifacts } from "@/lib/games/skull-king/artifacts"

export type SkullKingGameConfig = {
  players: string[]
  roundsSchema: number[]
  options: Record<Artifacts, boolean>
}
