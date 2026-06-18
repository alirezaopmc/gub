/**
 * Bid / won are trick counts for the current round; valid range is 0…handSize inclusive.
 */
export function clampTricksToHand(handSize: number, value: number | null): number | null {
  if (value === null) return null
  const max = Math.max(0, Math.floor(handSize))
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(max, n))
}

/**
 * Tricks the player is committed to for “made bid / missed bid” and bid vs won checks.
 * `bid` is the base in the bid cell; Harry the Giant stores ±1 in `harryGiantBidDelta` (B+1 / B−1).
 * The **effective** commitment is the base after applying that adjustment, clamped to the hand.
 * If Harry is set but `bid` is still null, the base is treated as 0.
 */
export function effectiveTricksBid(
  handSize: number,
  bid: number | null,
  harryGiantBidDelta: 1 | -1 | null
): number | null {
  if (harryGiantBidDelta === null) {
    return bid === null ? null : clampTricksToHand(handSize, bid)
  }
  const base = bid === null ? 0 : Math.floor(Number(bid))
  if (bid !== null && !Number.isFinite(base)) return null
  if (harryGiantBidDelta === 1) return clampTricksToHand(handSize, base + 1)
  if (harryGiantBidDelta === -1) return clampTricksToHand(handSize, base - 1)
  return clampTricksToHand(handSize, base)
}
