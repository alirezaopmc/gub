import { isCharacterLead, isEscapeLike } from "./cards"
import type { PlayedCard, StandardSuit } from "./types"

export type LeadContext = {
  /** Null when no follow suit required (character/advanced lead). */
  leadSuit: StandardSuit | null
  /** True when trick lead was escape-like and suit not yet set. */
  awaitingSuit: boolean
}

export function initialLeadContext(): LeadContext {
  return { leadSuit: null, awaitingSuit: false }
}

/** Update lead context as cards are played in order. */
export function resolveLeadContext(plays: readonly PlayedCard[]): LeadContext {
  if (plays.length === 0) return initialLeadContext()

  const first = plays[0]!
  const firstEscape = isEscapeLike(first.card, first.tigressMode)

  if (isCharacterLead(first.card, first.tigressMode)) {
    return { leadSuit: null, awaitingSuit: false }
  }

  if (firstEscape) {
    for (const play of plays) {
      if (play.card.def.kind === "suited") {
        return { leadSuit: play.card.def.suit, awaitingSuit: false }
      }
    }
    return { leadSuit: null, awaitingSuit: true }
  }

  if (first.card.def.kind === "suited") {
    return { leadSuit: first.card.def.suit, awaitingSuit: false }
  }

  return { leadSuit: null, awaitingSuit: false }
}

/** Lead context for the next player to act (partial trick). */
export function leadContextForNextPlay(plays: readonly PlayedCard[]): LeadContext {
  return resolveLeadContext(plays)
}

export function mustFollowSuit(ctx: LeadContext): boolean {
  return ctx.leadSuit !== null && !ctx.awaitingSuit
}
