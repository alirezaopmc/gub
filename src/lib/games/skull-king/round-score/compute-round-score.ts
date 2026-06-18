import type { SkullKingGameConfig } from "@/lib/games/skull-king/skull-king-game-config"
import { computeRoundScoreBreakdown } from "@/lib/games/skull-king/round-score/score-rules"
import type { PlayerRoundData } from "@/lib/games/skull-king/round-score/types"

/** Arguments for scoring the current round’s result for one seat; expand as rules are added. */
export type PlayerRoundScoreContext = {
  roundIndex: number
  handSize: number
  playerIndex: number
  player: PlayerRoundData
  /** Full round row (for comparisons, tie-breaks, etc., in a later implementation). */
  roundPlayers: readonly PlayerRoundData[]
  config: SkullKingGameConfig
}

/** Total points this round for one seat (see `score-rules`). */
export function computePlayerRoundScore(ctx: PlayerRoundScoreContext): number {
  return computeRoundScoreBreakdown({
    handSize: ctx.handSize,
    playerIndex: ctx.playerIndex,
    player: ctx.player,
    roundPlayers: ctx.roundPlayers,
  }).total
}
