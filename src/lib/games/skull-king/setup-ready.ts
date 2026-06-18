import { duplicatePlayerIndices, nameEqualityKey } from "@/lib/games/skull-king/crew-name-validation"
import { MIN_CREW_PLAYERS } from "@/lib/games/skull-king/setup/crew-manifest-types"

/** First failing start gate, in the same order as `isSetupReadyForStart` checks. */
export type SetupStartBlocker = "rounds" | "not_enough_names" | "duplicates"

const SETUP_START_BLOCKER_COPY: Record<SetupStartBlocker, string> = {
  rounds: "Set the round schedule.",
  not_enough_names: "Add at least two names.",
  duplicates: "Use a different name for each player.",
}

/** Crew step only — same checks as `getSetupStartBlocker` after rounds pass. */
export function getCrewStepBlocker(
  players: readonly string[]
): Extract<SetupStartBlocker, "not_enough_names" | "duplicates"> | null {
  const namedCount = players.filter((p) => nameEqualityKey(p) !== "").length
  if (namedCount < MIN_CREW_PLAYERS) return "not_enough_names"
  if (duplicatePlayerIndices(players).size > 0) return "duplicates"
  return null
}

/** Navigation step — empty round schema blocks advancing (and starting). */
export function getNavigationStepBlocker(
  roundsSchema: readonly number[]
): Extract<SetupStartBlocker, "rounds"> | null {
  if (roundsSchema.length === 0) return "rounds"
  return null
}

export function getSetupStartBlocker(
  players: readonly string[],
  roundsSchema: readonly number[]
): SetupStartBlocker | null {
  const roundsBlock = getNavigationStepBlocker(roundsSchema)
  if (roundsBlock) return roundsBlock
  return getCrewStepBlocker(players)
}

export function setupStartBlockerMessage(blocker: SetupStartBlocker): string {
  return SETUP_START_BLOCKER_COPY[blocker]
}

export function isSetupReadyForStart(
  players: readonly string[],
  roundsSchema: readonly number[]
): boolean {
  return getSetupStartBlocker(players, roundsSchema) === null
}
