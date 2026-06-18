/** Visual kind for event badges (chips) — used by EventBadge, derived from `RoundEvent`. */
export type EventBadgeKind =
  | "coin"
  | "skull"
  | "trump"
  | "bonus"
  | "kraken"
  | "pirate"
  | "alliance"
  | "capture"
  | "fourteen"

export type LegacyEventKind = "coin" | "skull" | "trump" | "bonus" | "kraken" | "pirate"

export type FourteenSuit = "green" | "yellow" | "purple" | "black"

export type RoundEvent =
  | { type: "legacy"; kind: LegacyEventKind; label: string; loggedAt?: number }
  | {
      type: "alliance"
      lootPlayerIndex: number
      trickWinnerIndex: number
      loggedAt?: number
    }
  | {
      type: "pirateAbility"
      ownerIndex: number
      pirate: "rascal"
      wager: 10 | 20
      loggedAt?: number
    }
  | {
      type: "characterCapture"
      capturerIndex: number
      capturingCard: "pirate" | "mermaid" | "king"
      /** Captures this trick; clamped by deck (pirate ≤ mermaids, king ≤ pirates). Mermaid→SK is always 1. */
      count: number
      loggedAt?: number
    }
  | {
      type: "fourteenBonus"
      playerIndex: number
      suit: FourteenSuit
      loggedAt?: number
    }

export type PlayerRoundData = {
  /** Base tricks bid in the cell (0…hand). */
  bid: number | null
  won: number | null
  events: RoundEvent[]
  /**
   * Harry the Giant: ±1 next to the base bid (not in event log). Cleared when the bid is edited manually.
   * Effective commitment for the round is `clamp(hand, bid ± 1)` — see `effectiveTricksBid`.
   */
  harryGiantBidDelta: 1 | -1 | null
  /** Points recorded for this player in this round (running tally layer uses this per round). */
  score: number
}

/** Captured when Bid/Won modal opens; revert bid/won/scores when closing without Done. */
export type BidWonModalRoundSnapshot = {
  finalized: boolean
  bidsSheetDismissed: boolean
  players: Array<Pick<PlayerRoundData, "bid" | "won" | "harryGiantBidDelta" | "score">>
}

export type RoundData = {
  players: PlayerRoundData[]
  /**
   * Set when Finish tallies the round. While false, this round’s per-player `score` is not shown
   * in the “this round” column and is excluded from running totals.
   */
  finalized: boolean
  /**
   * Set when the host dismisses the Bid/Won dialog with Done in the “bids” flow for this hand.
   * Drives auto-open: the sheet reopens after refresh only until this is true.
   */
  bidsSheetDismissed: boolean
}

export const MAX_EVENTS_PER_PLAYER_ROUND = 12

/** Deck limits for stacked hero captures in one hand (UI + scoring clamps). */
export const MAX_MERMAIDS_IN_GAME = 2
export const MAX_PIRATES_IN_GAME = 5

export const FOURTEEN_SUITS: readonly FourteenSuit[] = ["green", "yellow", "purple", "black"] as const
