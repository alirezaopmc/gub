import { describe, expect, it } from "vitest";
import {
  areIndicesContiguous,
  evaluateCombination,
  isStrongerCombination,
} from "../combinations";
import { createScoutCard } from "../deck";

describe("Scout Combinations Engine", () => {
  it("evaluates single cards", () => {
    const c1 = createScoutCard(4, 9, true); // active = 4
    const comb = evaluateCombination([c1]);
    expect(comb).not.toBeNull();
    expect(comb?.type).toBe("single");
    expect(comb?.value).toBe(4);
  });

  it("evaluates sets of matching numbers", () => {
    const c1 = createScoutCard(5, 8, true); // 5
    const c2 = createScoutCard(1, 5, false); // 5
    const c3 = createScoutCard(5, 9, true); // 5

    const set2 = evaluateCombination([c1, c2]);
    expect(set2?.type).toBe("set");
    expect(set2?.value).toBe(5);

    const set3 = evaluateCombination([c1, c2, c3]);
    expect(set3?.type).toBe("set");
    expect(set3?.value).toBe(5);
  });

  it("evaluates ascending and descending runs", () => {
    const r1 = createScoutCard(2, 6, true); // 2
    const r2 = createScoutCard(3, 7, true); // 3
    const r3 = createScoutCard(4, 8, true); // 4

    const ascRun = evaluateCombination([r1, r2, r3]);
    expect(ascRun?.type).toBe("run");
    expect(ascRun?.value).toBe(4); // highest value in run

    // Descending: 4, 3, 2
    const descRun = evaluateCombination([r3, r2, r1]);
    expect(descRun?.type).toBe("run");
    expect(descRun?.value).toBe(4);
  });

  it("rejects non-consecutive or mixed numbers as invalid", () => {
    const c1 = createScoutCard(2, 5, true); // 2
    const c2 = createScoutCard(4, 6, true); // 4 (not consecutive)
    expect(evaluateCombination([c1, c2])).toBeNull();

    const c3 = createScoutCard(2, 6, true); // 2
    const c4 = createScoutCard(3, 7, true); // 3
    const c5 = createScoutCard(2, 8, true); // 2 (2, 3, 2 is invalid)
    expect(evaluateCombination([c3, c4, c5])).toBeNull();
  });

  it("checks contiguity of selected card indices", () => {
    expect(areIndicesContiguous([0])).toBe(true);
    expect(areIndicesContiguous([2, 3, 4])).toBe(true);
    expect(areIndicesContiguous([4, 2, 3])).toBe(true); // order within selection doesn't matter
    expect(areIndicesContiguous([1, 3])).toBe(false); // gap between 1 and 3
    expect(areIndicesContiguous([0, 1, 3])).toBe(false);
  });

  describe("Combination Strength Comparison", () => {
    it("more cards always beats fewer cards", () => {
      const single9 = evaluateCombination([createScoutCard(9, 10, true)])!;
      const setPair2 = evaluateCombination([
        createScoutCard(2, 5, true),
        createScoutCard(2, 6, true),
      ])!;
      const run3cards = evaluateCombination([
        createScoutCard(1, 4, true),
        createScoutCard(2, 5, true),
        createScoutCard(3, 6, true),
      ])!;

      expect(isStrongerCombination(setPair2, single9)).toBe(true);
      expect(isStrongerCombination(run3cards, setPair2)).toBe(true);
      expect(isStrongerCombination(single9, setPair2)).toBe(false);
    });

    it("equal card count: sets beat runs", () => {
      const pair7s = evaluateCombination([
        createScoutCard(7, 1, true),
        createScoutCard(7, 2, true),
      ])!;
      const run89 = evaluateCombination([
        createScoutCard(8, 1, true),
        createScoutCard(9, 2, true),
      ])!;

      // Pair of 7s beats Run of 8-9 even though 9 > 7
      expect(isStrongerCombination(pair7s, run89)).toBe(true);
      expect(isStrongerCombination(run89, pair7s)).toBe(false);
    });

    it("equal type and count: higher value wins", () => {
      const single5 = evaluateCombination([createScoutCard(5, 8, true)])!;
      const single8 = evaluateCombination([createScoutCard(8, 2, true)])!;
      expect(isStrongerCombination(single8, single5)).toBe(true);
      expect(isStrongerCombination(single5, single8)).toBe(false);

      const run34 = evaluateCombination([
        createScoutCard(3, 1, true),
        createScoutCard(4, 2, true),
      ])!;
      const run56 = evaluateCombination([
        createScoutCard(5, 1, true),
        createScoutCard(6, 2, true),
      ])!;
      expect(isStrongerCombination(run56, run34)).toBe(true);
      expect(isStrongerCombination(run34, run56)).toBe(false);
    });
  });
});
