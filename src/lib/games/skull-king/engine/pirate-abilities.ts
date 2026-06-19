import type { PendingAbility, PirateId, RoundState } from "./types"

export function abilityRequired(
  pirate: PirateId,
  artifactsEnabled: boolean,
  isFinalTrick: boolean
): boolean {
  if (!artifactsEnabled) return false
  if (pirate === "harry") return true
  return !isFinalTrick
}

export function createPendingAbility(
  pirate: PirateId,
  winnerIndex: number,
  trickIndex: number,
  isFinalTrick: boolean,
  artifactsEnabled: boolean
): PendingAbility | null {
  if (!abilityRequired(pirate, artifactsEnabled, isFinalTrick)) return null
  return { pirate, winnerIndex, trickIndex, isFinalTrick }
}

export function pirateFromWinningCard(
  cardKind: string,
  pirateId?: PirateId
): PirateId | null {
  if (cardKind === "pirate" && pirateId) return pirateId
  return null
}

export function canPlayDuringAbility(round: RoundState): boolean {
  return round.phase !== "ability"
}
