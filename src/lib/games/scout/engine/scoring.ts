import type { ScoutRoundScoreBreakdown, ScoutRoundState } from "./types";

/**
 * Calculates the score breakdown for each player in a finished Scout round.
 *
 * Scoring formula:
 * Score = (Cards in Score Pile) + (Scout Chips) - (Cards in Hand)
 *
 * Exception:
 * If the round ended by "table_cleared" (all opponents scouted and turn returned to the active set owner),
 * that owner does NOT deduct cards remaining in their hand.
 */
export function calculateRoundScores(
  state: ScoutRoundState,
): ScoutRoundScoreBreakdown[] {
  return state.hands.map((hand) => {
    const isExemptOwner =
      state.roundEndReason === "table_cleared" &&
      state.activeSet?.ownerSeatIndex === hand.seatIndex;

    const cardsCollected = hand.scorePileCount;
    const scoutChips = hand.scoutChips;
    const handPenalty = isExemptOwner ? 0 : hand.cards.length;
    const totalRoundScore = cardsCollected + scoutChips - handPenalty;

    return {
      seatIndex: hand.seatIndex,
      playerName:
        state.playerNames[hand.seatIndex] ?? `Player ${hand.seatIndex + 1}`,
      cardsCollected,
      scoutChips,
      handPenalty,
      totalRoundScore,
    };
  });
}

/**
 * Calculates instant standalone score for physical tableside scoring companion.
 */
export function calculateInstantScore(
  cardsCollected: number,
  scoutChips: number,
  cardsRemainingInHand: number,
  isOwnerExempt = false,
): number {
  const penalty = isOwnerExempt ? 0 : Math.max(0, cardsRemainingInHand);
  return Math.max(0, cardsCollected) + Math.max(0, scoutChips) - penalty;
}
