export {
  clampTricksToHand,
  effectiveTricksBid,
} from "@/lib/games/skull-king/round-score/bid-won-validation";
export {
  computePlayerRoundScore,
  type PlayerRoundScoreContext,
} from "@/lib/games/skull-king/round-score/compute-round-score";
export {
  clearRoundData,
  loadRoundData,
  type PersistedRoundState,
  saveRoundData,
} from "@/lib/games/skull-king/round-score/round-data-storage";
export {
  createEmptyRounds,
  cumulativeScoreForPlayer,
} from "@/lib/games/skull-king/round-score/round-helpers";
export {
  type RoundScoreStore,
  useRoundScoreStore,
} from "@/lib/games/skull-king/round-score/round-score-store";
export {
  clampCharacterCaptureCount,
  computeRoundScoreBreakdown,
  previewActiveBonus,
  type RoundScoreBreakdown,
  type ScoreBreakdownContext,
  scoreAlliance,
  scoreBidWon,
  scoreFourteenBonus,
  scoreHeroCaptures,
  scoreRascal,
} from "@/lib/games/skull-king/round-score/score-rules";
export type {
  EventBadgeKind,
  FourteenSuit,
  LegacyEventKind,
  PlayerRoundData,
  RoundData,
  RoundEvent,
} from "@/lib/games/skull-king/round-score/types";
export {
  FOURTEEN_SUITS,
  MAX_EVENTS_PER_PLAYER_ROUND,
  MAX_MERMAIDS_IN_GAME,
  MAX_PIRATES_IN_GAME,
} from "@/lib/games/skull-king/round-score/types";
