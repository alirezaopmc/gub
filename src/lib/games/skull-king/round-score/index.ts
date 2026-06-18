export type {
  EventBadgeKind,
  FourteenSuit,
  LegacyEventKind,
  PlayerRoundData,
  RoundData,
  RoundEvent,
} from "@/lib/games/skull-king/round-score/types"
export {
  FOURTEEN_SUITS,
  MAX_EVENTS_PER_PLAYER_ROUND,
  MAX_MERMAIDS_IN_GAME,
  MAX_PIRATES_IN_GAME,
} from "@/lib/games/skull-king/round-score/types"
export { clampTricksToHand, effectiveTricksBid } from "@/lib/games/skull-king/round-score/bid-won-validation"
export {
  computePlayerRoundScore,
  type PlayerRoundScoreContext,
} from "@/lib/games/skull-king/round-score/compute-round-score"
export {
  clampCharacterCaptureCount,
  computeRoundScoreBreakdown,
  previewActiveBonus,
  scoreAlliance,
  scoreBidWon,
  scoreFourteenBonus,
  scoreHeroCaptures,
  scoreRascal,
  type RoundScoreBreakdown,
  type ScoreBreakdownContext,
} from "@/lib/games/skull-king/round-score/score-rules"
export { cumulativeScoreForPlayer, createEmptyRounds } from "@/lib/games/skull-king/round-score/round-helpers"
export {
  clearRoundData,
  loadRoundData,
  saveRoundData,
  type PersistedRoundState,
} from "@/lib/games/skull-king/round-score/round-data-storage"
export { useRoundScoreStore, type RoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"
