/** Serializable card and match types for the Skull King rules engine. */

export type StandardSuit = "green" | "yellow" | "purple" | "black"

export type PirateId =
  | "rosie"
  | "bendt"
  | "rascal"
  | "juanita"
  | "harry"

export type MermaidId = "alyra" | "sirena"

export type CardKind =
  | { kind: "suited"; suit: StandardSuit; rank: number }
  | { kind: "escape"; index: number }
  | { kind: "pirate"; pirate: PirateId }
  | { kind: "tigress" }
  | { kind: "skull_king" }
  | { kind: "mermaid"; mermaid: MermaidId }
  | { kind: "kraken" }
  | { kind: "loot"; index: number }
  | { kind: "whale" }

export type Card = {
  id: string
  def: CardKind
}

export type TigressMode = "pirate" | "escape"

export type PlayedCard = {
  card: Card
  playerIndex: number
  playOrder: number
  tigressMode?: TigressMode
}

export type TrickOutcome =
  | { type: "won"; winnerIndex: number; plays: PlayedCard[] }
  | { type: "destroyed"; wouldBeWinnerIndex: number; plays: PlayedCard[] }
  | { type: "discarded"; wouldBeWinnerIndex: number; plays: PlayedCard[] }

export type CaptureBonus =
  | { type: "fourteen"; suit: StandardSuit; trickWinnerIndex: number }
  | { type: "mermaid_by_pirate"; trickWinnerIndex: number }
  | { type: "pirate_by_king"; trickWinnerIndex: number }
  | { type: "king_by_mermaid"; trickWinnerIndex: number }

export type TrickResult = {
  outcome: TrickOutcome
  captures: CaptureBonus[]
  lootAlliance?: { lootPlayerIndex: number; trickWinnerIndex: number }
}

export type RoundPhase =
  | "bidding"
  | "playing"
  | "ability"
  | "scoring"

export type PendingAbility = {
  pirate: PirateId
  winnerIndex: number
  trickIndex: number
  isFinalTrick: boolean
}

export type PlayerBid = {
  bid: number | null
  harryGiantDelta: 1 | -1 | null
}

export type RoundState = {
  roundIndex: number
  handSize: number
  dealerIndex: number
  leaderIndex: number
  phase: RoundPhase
  hands: Card[][]
  undealt: Card[]
  bids: PlayerBid[]
  tricksWon: number[]
  currentTrick: PlayedCard[]
  trickLeaderIndex: number
  completedTricks: TrickResult[]
  pendingAbility: PendingAbility | null
  /** Rosie: override next trick leader after ability resolves. */
  nextLeaderOverride: number | null
  /** Juanita peek: player who may view undealt (ability only). */
  juanitaPeekPlayer: number | null
  /** Rascal wager chosen this round (ability). */
  rascalWager: { playerIndex: number; wager: 0 | 10 | 20 } | null
  roundScores: number[] | null
}

export type MatchPhase = "lobby" | "in_progress" | "game_over"

export type MatchConfig = {
  playerCount: number
  playerNames: string[]
  roundsSchema: number[]
  artifacts: {
    pirateAbilities: boolean
    characterCapture: boolean
    whale: boolean
    kraken: boolean
    loot: boolean
    fourteenBonus: boolean
  }
}

export type PlayerRoundResult = {
  seatIndex: number
  bid: number | null
  won: number
  main: number
  bonus: number
  total: number
  madeBid: boolean
}

export type RoundHistoryEntry = {
  roundIndex: number
  handSize: number
  dealerIndex: number
  leaderIndex: number
  results: PlayerRoundResult[]
}

export type MatchState = {
  code: string
  hostPlayerId: string
  playerIds: string[]
  config: MatchConfig
  phase: MatchPhase
  currentRound: RoundState | null
  cumulativeScores: number[]
  roundHistory: RoundHistoryEntry[]
  /** Seat index of player who dealt round 1 (random with seed). */
  initialDealerIndex: number
  version: number
  /** Shared victory on tie (app rule). */
  winners: number[] | null
}

export type MatchAction =
  | { type: "configure"; config: Partial<MatchConfig> }
  | { type: "start_match" }
  | { type: "start_round" }
  | { type: "submit_bid"; playerIndex: number; bid: number; harryGiantDelta?: 1 | -1 | null }
  | { type: "play_card"; playerIndex: number; cardId: string; tigressMode?: TigressMode }
  | { type: "resolve_ability_rosie"; nextLeaderIndex: number }
  | { type: "resolve_ability_bendt"; drawThenDiscard: [string, string] }
  | { type: "resolve_ability_rascal"; wager: 0 | 10 | 20 }
  | { type: "resolve_ability_juanita" }
  | { type: "resolve_ability_harry"; delta: 1 | -1 | 0 }
  | { type: "confirm_round" }
  | { type: "advance_round" }
  | { type: "noop" }

export type MatchError =
  | "not_host"
  | "invalid_phase"
  | "not_your_turn"
  | "illegal_card"
  | "invalid_bid"
  | "ability_not_pending"
  | "invalid_action"

export type ReduceResult =
  | { ok: true; state: MatchState }
  | { ok: false; error: MatchError }
