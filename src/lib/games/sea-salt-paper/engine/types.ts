/**
 * Sea Salt & Paper — Domain Types & Scoring Contracts
 * Designed by Bruno Cathala & Théo Rivière
 */

export type DuoType = "crab" | "boat" | "fish" | "swimmer_shark";

export type CollectionType = "shell" | "octopus" | "penguin" | "sailor";

export type MultiplierType =
  | "lighthouse" // +1 per Boat
  | "shoal_of_fish" // +1 per Fish
  | "penguin_colony" // +2 per Penguin
  | "captain"; // +3 per Sailor

export type CardColor =
  | "dark_blue"
  | "light_blue"
  | "black"
  | "yellow"
  | "green"
  | "white"
  | "magenta"
  | "orange"
  | "gray"
  | "purple";

export type RoundDeclaration = "stop" | "last_chance" | "none";

export interface HandCounts {
  // Played / Hand Duos (number of pairs)
  crabPairs: number;
  boatPairs: number;
  fishPairs: number;
  swimmerSharkPairs: number;

  // Set Collections (number of individual cards)
  shells: number; // 0..6
  octopuses: number; // 0..5
  penguins: number; // 0..3
  sailors: number; // 0..2

  // Multipliers (number of multiplier cards held)
  lighthouse: number; // +1 per boat card
  shoalOfFish: number; // +1 per fish card
  penguinColony: number; // +2 per penguin card
  captain: number; // +3 per sailor card

  // Mermaids (0..4)
  mermaids: number;

  // Color breakdown for Mermaid and Color Bonus scoring (sorted or counts per color)
  colorCardCounts?: number[];
  highestColorCount?: number;
  secondColorCount?: number;
}

export interface ScoreBreakdown {
  duoPoints: number;
  shellPoints: number;
  octopusPoints: number;
  penguinPoints: number;
  sailorPoints: number;
  multiplierPoints: number;
  mermaidPoints: number;
  rawTotal: number;
  hasFourMermaids: boolean;
}

export interface RoundPlayerResult {
  playerId: string;
  playerName: string;
  declaration: RoundDeclaration;
  counts: HandCounts;
  breakdown: ScoreBreakdown;
  colorBonus: number;
  finalRoundScore: number;
  wonLastChance?: boolean;
}

export interface SeaSaltRoundSummary {
  roundNumber: number;
  playerResults: RoundPlayerResult[];
  winnerPlayerId?: string;
}

export const WIN_TARGET_SCORES: Record<number, number> = {
  2: 40,
  3: 35,
  4: 30,
};
