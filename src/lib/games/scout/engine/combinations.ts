import { getActiveValue } from "./deck";
import type { Combination, ScoutCard } from "./types";

/**
 * Validates whether the given list of selected cards forms a valid Scout combination
 * (Single, Set, or Run). Returns the Combination if valid, or null if invalid.
 */
export function evaluateCombination(cards: ScoutCard[]): Combination | null {
  if (cards.length === 0) return null;

  const values = cards.map(getActiveValue);

  // Single card
  if (values.length === 1) {
    const val = values[0]!;
    return {
      type: "single",
      cards,
      value: val,
      secondaryValue: val,
    };
  }

  // Set: all values are identical
  const isSet = values.every((v) => v === values[0]);
  if (isSet) {
    const val = values[0]!;
    return {
      type: "set",
      cards,
      value: val,
      secondaryValue: val,
    };
  }

  // Run: strictly consecutive ascending (e.g. 2, 3, 4) or descending (e.g. 7, 6, 5)
  let isAscending = true;
  let isDescending = true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i + 1]! !== values[i]! + 1) isAscending = false;
    if (values[i + 1]! !== values[i]! - 1) isDescending = false;
  }

  if (isAscending || isDescending) {
    const highestVal = Math.max(...values);
    const lowestVal = Math.min(...values);
    return {
      type: "run",
      cards,
      value: highestVal,
      secondaryValue: lowestVal,
    };
  }

  return null;
}

/**
 * Validates that the selected indices represent an adjacent, contiguous sequence
 * of cards in the player's hand.
 */
export function areIndicesContiguous(indices: number[]): boolean {
  if (indices.length <= 1) return true;
  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1]! !== sorted[i]! + 1) return false;
  }
  return true;
}

/**
 * Returns true if the candidate combination is strictly stronger than the target active set.
 * Scout ranking rules:
 * 1. More cards beat fewer cards.
 * 2. At equal card count: Sets beat Runs.
 * 3. At equal type & count: Higher primary value wins.
 */
export function isStrongerCombination(
  candidate: Combination,
  target: Combination,
): boolean {
  // 1. Card count is king
  if (candidate.cards.length > target.cards.length) return true;
  if (candidate.cards.length < target.cards.length) return false;

  // 2. Equal card count: Single vs Single
  if (candidate.type === "single" && target.type === "single") {
    return candidate.value > target.value;
  }

  // 3. Equal count (>= 2 cards): Set vs Run
  if (candidate.type === "set" && target.type === "run") return true;
  if (candidate.type === "run" && target.type === "set") return false;

  // 4. Equal type (Set vs Set or Run vs Run)
  return candidate.value > target.value;
}
