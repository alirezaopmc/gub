import { isCharacterLead, isEscapeLike } from "./cards";
import type { PlayedCard, RuleFlags, StandardSuit } from "./types";

export type LeadContext = {
  /** Null when no follow suit required (character/advanced lead). */
  leadSuit: StandardSuit | null;
  /** True when trick lead was escape-like and suit not yet set. */
  awaitingSuit: boolean;
};

export function initialLeadContext(): LeadContext {
  return { leadSuit: null, awaitingSuit: false };
}

/** Update lead context as cards are played in order. */
export function resolveLeadContext(
  plays: readonly PlayedCard[],
  flags?: RuleFlags,
): LeadContext {
  if (plays.length === 0) return initialLeadContext();

  const first = plays[0]!;
  const firstEscape = isEscapeLike(first.card, first.tigressMode);

  if (isCharacterLead(first.card, first.tigressMode)) {
    return { leadSuit: null, awaitingSuit: false };
  }

  if (firstEscape) {
    const deferThroughCharacters =
      flags?.escapeLeadDefersThroughCharacters ?? false;
    for (let i = 1; i < plays.length; i++) {
      const play = plays[i]!;
      if (play.card.def.kind === "suited") {
        return { leadSuit: play.card.def.suit, awaitingSuit: false };
      }
      if (
        isEscapeLike(play.card, play.tigressMode) ||
        play.card.def.kind === "loot"
      ) {
        continue;
      }
      if (!deferThroughCharacters) {
        return { leadSuit: null, awaitingSuit: false };
      }
    }
    return { leadSuit: null, awaitingSuit: true };
  }

  if (first.card.def.kind === "suited") {
    return { leadSuit: first.card.def.suit, awaitingSuit: false };
  }

  return { leadSuit: null, awaitingSuit: false };
}

/** Lead context for the next player to act (partial trick). */
export function leadContextForNextPlay(
  plays: readonly PlayedCard[],
  flags?: RuleFlags,
): LeadContext {
  return resolveLeadContext(plays, flags);
}

export function mustFollowSuit(ctx: LeadContext): boolean {
  return ctx.leadSuit !== null && !ctx.awaitingSuit;
}
