/** Serializable types for the Scout (Oink Games) rules and scoring engine. */

export type ScoutCard = {
  id: string;
  top: number;
  bottom: number;
  /** Active orientation when held in hand (true = top number is active, false = bottom is active). */
  isTopActive: boolean;
};

export type CombinationType = "single" | "set" | "run";

export type Combination = {
  type: CombinationType;
  cards: ScoutCard[];
  /** Primary evaluation value (rank for single/set, highest value for run). */
  value: number;
  /** Secondary evaluation tiebreaker (e.g., lowest card in run if applicable). */
  secondaryValue: number;
};

export type ActiveSet = {
  combination: Combination;
  ownerSeatIndex: number;
};

export type PlayerHand = {
  seatIndex: number;
  cards: ScoutCard[];
  hasScoutAndShowAvailable: boolean;
  scorePileCount: number;
  scoutChips: number;
};

export type RoundPhase = "active" | "round_over";

export type ScoutRoundState = {
  playerCount: number;
  playerNames: string[];
  hands: PlayerHand[];
  activeSet: ActiveSet | null;
  currentTurnSeat: number;
  dealerSeatIndex: number;
  phase: RoundPhase;
  roundEndReason: "empty_hand" | "table_cleared" | null;
  winningSeatIndex: number | null;
  roundScores: number[] | null;
  history: string[];
};

export type ScoutRoundScoreBreakdown = {
  seatIndex: number;
  playerName: string;
  cardsCollected: number;
  scoutChips: number;
  handPenalty: number;
  totalRoundScore: number;
};

export type ScoutAction =
  | {
      type: "SHOW";
      seatIndex: number;
      cardIndices: number[];
    }
  | {
      type: "SCOUT";
      seatIndex: number;
      takeFrom: "left" | "right";
      insertAtIndex: number;
      useTop: boolean;
    }
  | {
      type: "SCOUT_AND_SHOW";
      seatIndex: number;
      takeFrom: "left" | "right";
      insertAtIndex: number;
      useTop: boolean;
      showCardIndices: number[];
    };
