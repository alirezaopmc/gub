import { nameEqualityKey } from "@/lib/games/skull-king/crew-name-validation"
import type { SkullKingGameConfig } from "@/lib/games/skull-king/skull-king-game-config"
import type { RoundData } from "@/lib/games/skull-king/round-score/types"

/** Every **named** seat has a non-null `bid` (empty names skipped). */
export function areAllNamedPlayersBidsSet(
  config: SkullKingGameConfig,
  round: RoundData | undefined,
): boolean {
  if (!round) return true
  for (let i = 0; i < config.players.length; i++) {
    if (nameEqualityKey(config.players[i] ?? "") === "") continue
    const p = round.players[i]
    if (!p || p.bid === null) return false
  }
  return true
}

/** Every **named** seat has a non-null `won` (empty names skipped). */
export function areAllNamedPlayersWonSet(
  config: SkullKingGameConfig,
  round: RoundData | undefined,
): boolean {
  if (!round) return true
  for (let i = 0; i < config.players.length; i++) {
    if (nameEqualityKey(config.players[i] ?? "") === "") continue
    const p = round.players[i]
    if (!p || p.won === null) return false
  }
  return true
}
