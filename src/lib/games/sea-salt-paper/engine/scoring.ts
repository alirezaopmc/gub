/**
 * Sea Salt & Paper — Pure Scoring Engine
 * Designed by Bruno Cathala & Théo Rivière
 */

import type {
  HandCounts,
  RoundDeclaration,
  RoundPlayerResult,
  ScoreBreakdown,
  SeaSaltRoundSummary,
} from "./types";

/** Shell collection points table (indexed by count 0..6) */
export const SHELL_POINTS_TABLE: readonly number[] = [0, 0, 2, 4, 6, 9, 12];

/** Octopus collection points table (indexed by count 0..5) */
export const OCTOPUS_POINTS_TABLE: readonly number[] = [0, 0, 1, 3, 6, 9];

/** Penguin collection points table (indexed by count 0..3) */
export const PENGUIN_POINTS_TABLE: readonly number[] = [0, 1, 3, 5];

/** Sailor collection points table (indexed by count 0..2) */
export const SAILOR_POINTS_TABLE: readonly number[] = [0, 0, 5];

export function getShellPoints(count: number): number {
  if (count <= 0) return 0;
  if (count >= SHELL_POINTS_TABLE.length) {
    return SHELL_POINTS_TABLE[SHELL_POINTS_TABLE.length - 1] ?? 12;
  }
  return SHELL_POINTS_TABLE[count] ?? 0;
}

export function getOctopusPoints(count: number): number {
  if (count <= 0) return 0;
  if (count >= OCTOPUS_POINTS_TABLE.length) {
    return OCTOPUS_POINTS_TABLE[OCTOPUS_POINTS_TABLE.length - 1] ?? 9;
  }
  return OCTOPUS_POINTS_TABLE[count] ?? 0;
}

export function getPenguinPoints(count: number): number {
  if (count <= 0) return 0;
  if (count >= PENGUIN_POINTS_TABLE.length) {
    return PENGUIN_POINTS_TABLE[PENGUIN_POINTS_TABLE.length - 1] ?? 5;
  }
  return PENGUIN_POINTS_TABLE[count] ?? 0;
}

export function getSailorPoints(count: number): number {
  if (count <= 0) return 0;
  if (count >= SAILOR_POINTS_TABLE.length) {
    return SAILOR_POINTS_TABLE[SAILOR_POINTS_TABLE.length - 1] ?? 5;
  }
  return SAILOR_POINTS_TABLE[count] ?? 0;
}

/**
 * Calculates mermaid points based on number of mermaids and descending color counts.
 * Mermaid 1 gives points equal to highest color count.
 * Mermaid 2 gives points equal to 2nd highest color count.
 * Mermaid 3 gives points equal to 3rd highest color count.
 * 4 Mermaids = Instant Win.
 */
export function calculateMermaidPoints(
  mermaids: number,
  colorCounts?: number[],
  fallbackHighest = 0,
  fallbackSecond = 0,
): { points: number; isInstantWin: boolean } {
  if (mermaids >= 4) {
    return { points: 0, isInstantWin: true };
  }
  if (mermaids <= 0) {
    return { points: 0, isInstantWin: false };
  }

  const sorted = colorCounts
    ? [...colorCounts].sort((a, b) => b - a)
    : [fallbackHighest, fallbackSecond, 0, 0];

  let points = 0;
  for (let i = 0; i < mermaids; i++) {
    points += sorted[i] ?? 0;
  }

  return { points, isInstantWin: false };
}

/**
 * Calculates raw score breakdown for a single hand in Sea Salt & Paper.
 */
export function calculateHandBreakdown(counts: HandCounts): ScoreBreakdown {
  const duoPoints =
    Math.max(0, counts.crabPairs) +
    Math.max(0, counts.boatPairs) +
    Math.max(0, counts.fishPairs) +
    Math.max(0, counts.swimmerSharkPairs);

  const shellPoints = getShellPoints(counts.shells);
  const octopusPoints = getOctopusPoints(counts.octopuses);
  const penguinPoints = getPenguinPoints(counts.penguins);
  const sailorPoints = getSailorPoints(counts.sailors);

  // Multipliers:
  // Lighthouse: +1 per boat card (each boat pair is 2 boats)
  const totalBoats = Math.max(0, counts.boatPairs) * 2;
  const lighthousePoints = Math.max(0, counts.lighthouse) * totalBoats;

  // Shoal of Fish: +1 per fish card (each fish pair is 2 fish)
  const totalFish = Math.max(0, counts.fishPairs) * 2;
  const fishMultiplierPoints = Math.max(0, counts.shoalOfFish) * totalFish;

  // Penguin Colony: +2 per penguin card
  const penguinMultiplierPoints =
    Math.max(0, counts.penguinColony) * (Math.max(0, counts.penguins) * 2);

  // Captain: +3 per sailor card
  const captainPoints =
    Math.max(0, counts.captain) * (Math.max(0, counts.sailors) * 3);

  const multiplierPoints =
    lighthousePoints +
    fishMultiplierPoints +
    penguinMultiplierPoints +
    captainPoints;

  const mermaidRes = calculateMermaidPoints(
    counts.mermaids,
    counts.colorCardCounts,
    counts.highestColorCount ?? 0,
    counts.secondColorCount ?? 0,
  );

  const rawTotal =
    duoPoints +
    shellPoints +
    octopusPoints +
    penguinPoints +
    sailorPoints +
    multiplierPoints +
    mermaidRes.points;

  return {
    duoPoints,
    shellPoints,
    octopusPoints,
    penguinPoints,
    sailorPoints,
    multiplierPoints,
    mermaidPoints: mermaidRes.points,
    rawTotal,
    hasFourMermaids: mermaidRes.isInstantWin,
  };
}

/**
 * Resolves a complete round for 2 to 4 players, taking into account
 * declarations ("stop" vs "last_chance") and color bonus rules.
 */
export function resolveSeaSaltRound(
  roundNumber: number,
  inputs: Array<{
    playerId: string;
    playerName: string;
    declaration: RoundDeclaration;
    counts: HandCounts;
    colorBonus?: number;
  }>,
): SeaSaltRoundSummary {
  // First evaluate individual hand breakdowns
  const playersIntermediate = inputs.map((inp) => {
    const breakdown = calculateHandBreakdown(inp.counts);
    const colorBonus =
      inp.colorBonus ??
      (inp.counts.colorCardCounts
        ? Math.max(0, ...inp.counts.colorCardCounts)
        : (inp.counts.highestColorCount ?? 0));

    return {
      playerId: inp.playerId,
      playerName: inp.playerName,
      declaration: inp.declaration,
      counts: inp.counts,
      breakdown,
      colorBonus,
    };
  });

  // Check for instant win (4 mermaids)
  const instantWinner = playersIntermediate.find(
    (p) => p.breakdown.hasFourMermaids,
  );
  if (instantWinner) {
    return {
      roundNumber,
      winnerPlayerId: instantWinner.playerId,
      playerResults: playersIntermediate.map((p) => ({
        ...p,
        finalRoundScore: p.playerId === instantWinner.playerId ? 999 : 0,
      })),
    };
  }

  // Check if someone declared "last_chance"
  const lastChanceDeclarer = playersIntermediate.find(
    (p) => p.declaration === "last_chance",
  );

  const playerResults: RoundPlayerResult[] = [];

  if (lastChanceDeclarer) {
    const opponents = playersIntermediate.filter(
      (p) => p.playerId !== lastChanceDeclarer.playerId,
    );
    const highestOpponentScore = Math.max(
      ...opponents.map((o) => o.breakdown.rawTotal),
    );

    // Declaring player must have strictly more points than all opponents
    const wonLastChance =
      lastChanceDeclarer.breakdown.rawTotal > highestOpponentScore;

    for (const p of playersIntermediate) {
      if (p.playerId === lastChanceDeclarer.playerId) {
        playerResults.push({
          ...p,
          wonLastChance,
          finalRoundScore: wonLastChance
            ? p.breakdown.rawTotal + p.colorBonus
            : p.colorBonus,
        });
      } else {
        // Opponent scoring
        playerResults.push({
          ...p,
          finalRoundScore: wonLastChance ? p.colorBonus : p.breakdown.rawTotal,
        });
      }
    }
  } else {
    // Normal round or "stop" declared: everyone scores raw total
    for (const p of playersIntermediate) {
      playerResults.push({
        ...p,
        finalRoundScore: p.breakdown.rawTotal,
      });
    }
  }

  return {
    roundNumber,
    playerResults,
  };
}
