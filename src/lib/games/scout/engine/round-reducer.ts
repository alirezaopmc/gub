import {
  areIndicesContiguous,
  evaluateCombination,
  isStrongerCombination,
} from "./combinations";
import { dealHands, getDeckForPlayerCount, shuffleCards } from "./deck";
import { calculateRoundScores } from "./scoring";
import type {
  ActiveSet,
  PlayerHand,
  ScoutAction,
  ScoutCard,
  ScoutRoundState,
} from "./types";

export function createScoutRound(
  playerCount: number,
  playerNames?: string[],
  seedCards?: ScoutCard[],
): ScoutRoundState {
  const names =
    playerNames ??
    Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);

  const deck = seedCards ?? shuffleCards(getDeckForPlayerCount(playerCount));
  const { hands } = dealHands(deck, playerCount);

  return {
    playerCount,
    playerNames: names,
    hands,
    activeSet: null,
    currentTurnSeat: 0,
    dealerSeatIndex: 0,
    phase: "active",
    roundEndReason: null,
    winningSeatIndex: null,
    roundScores: null,
    history: ["Round started. Deal completed."],
  };
}

export type ActionError = {
  error: string;
};

export function applyScoutAction(
  state: ScoutRoundState,
  action: ScoutAction,
): ScoutRoundState | ActionError {
  if (state.phase !== "active") {
    return { error: "round_already_ended" };
  }

  if (action.seatIndex !== state.currentTurnSeat) {
    return { error: "not_player_turn" };
  }

  const hand = state.hands[action.seatIndex];
  if (!hand) return { error: "invalid_player" };

  switch (action.type) {
    case "SHOW": {
      return executeShow(state, hand, action.cardIndices);
    }
    case "SCOUT": {
      return executeScout(
        state,
        hand,
        action.takeFrom,
        action.insertAtIndex,
        action.useTop,
      );
    }
    case "SCOUT_AND_SHOW": {
      if (!hand.hasScoutAndShowAvailable) {
        return { error: "scout_and_show_already_used" };
      }
      return executeScoutAndShow(
        state,
        hand,
        action.takeFrom,
        action.insertAtIndex,
        action.useTop,
        action.showCardIndices,
      );
    }
    default:
      return { error: "unknown_action" };
  }
}

function executeShow(
  state: ScoutRoundState,
  hand: PlayerHand,
  cardIndices: number[],
): ScoutRoundState | ActionError {
  if (cardIndices.length === 0) return { error: "no_cards_selected" };
  if (!areIndicesContiguous(cardIndices)) {
    return { error: "cards_must_be_contiguous" };
  }

  const sortedIndices = [...cardIndices].sort((a, b) => a - b);
  const selectedCards: ScoutCard[] = [];
  for (const idx of sortedIndices) {
    const card = hand.cards[idx];
    if (!card) return { error: "invalid_card_index" };
    selectedCards.push(card);
  }

  const candidateComb = evaluateCombination(selectedCards);
  if (!candidateComb) {
    return { error: "invalid_combination" };
  }

  // If there is an active set, candidate must strictly beat it
  if (state.activeSet) {
    if (!isStrongerCombination(candidateComb, state.activeSet.combination)) {
      return { error: "combination_not_strong_enough" };
    }
  }

  // Remove cards from player's hand
  const newHandCards = hand.cards.filter(
    (_, idx) => !sortedIndices.includes(idx),
  );
  const cardsWonCount = state.activeSet
    ? state.activeSet.combination.cards.length
    : 0;

  const updatedHand: PlayerHand = {
    ...hand,
    cards: newHandCards,
    scorePileCount: hand.scorePileCount + cardsWonCount,
  };

  const updatedHands = state.hands.map((h) =>
    h.seatIndex === hand.seatIndex ? updatedHand : h,
  );

  const newActiveSet: ActiveSet = {
    combination: candidateComb,
    ownerSeatIndex: hand.seatIndex,
  };

  // Check if hand is empty -> End of Round
  if (newHandCards.length === 0) {
    const nextState: ScoutRoundState = {
      ...state,
      hands: updatedHands,
      activeSet: newActiveSet,
      phase: "round_over",
      roundEndReason: "empty_hand",
      winningSeatIndex: hand.seatIndex,
      history: [
        ...state.history,
        `${state.playerNames[hand.seatIndex]} emptied their hand with ${candidateComb.type}!`,
      ],
    };
    const breakdowns = calculateRoundScores(nextState);
    nextState.roundScores = breakdowns.map((b) => b.totalRoundScore);
    return nextState;
  }

  const nextTurn = (state.currentTurnSeat + 1) % state.playerCount;

  return {
    ...state,
    hands: updatedHands,
    activeSet: newActiveSet,
    currentTurnSeat: nextTurn,
    history: [
      ...state.history,
      `${state.playerNames[hand.seatIndex]} played ${candidateComb.type} (value: ${candidateComb.value}).`,
    ],
  };
}

function executeScout(
  state: ScoutRoundState,
  hand: PlayerHand,
  takeFrom: "left" | "right",
  insertAtIndex: number,
  useTop: boolean,
): ScoutRoundState | ActionError {
  if (!state.activeSet) return { error: "no_active_set_to_scout" };
  if (state.activeSet.ownerSeatIndex === hand.seatIndex) {
    return { error: "cannot_scout_own_set" };
  }

  const activeCards = state.activeSet.combination.cards;
  if (activeCards.length === 0) return { error: "active_set_empty" };

  const takenCard =
    takeFrom === "left"
      ? activeCards[0]!
      : activeCards[activeCards.length - 1]!;
  const remainingActiveCards =
    takeFrom === "left" ? activeCards.slice(1) : activeCards.slice(0, -1);

  const orientedCard: ScoutCard = {
    ...takenCard,
    isTopActive: useTop,
  };

  // Insert into hand at specified position
  const safeInsertIdx = Math.max(0, Math.min(insertAtIndex, hand.cards.length));
  const newHandCards = [...hand.cards];
  newHandCards.splice(safeInsertIdx, 0, orientedCard);

  // Active set owner receives +1 scout chip
  const ownerSeat = state.activeSet.ownerSeatIndex;
  const updatedHands = state.hands.map((h) => {
    if (h.seatIndex === hand.seatIndex) {
      return { ...h, cards: newHandCards };
    }
    if (h.seatIndex === ownerSeat) {
      return { ...h, scoutChips: h.scoutChips + 1 };
    }
    return h;
  });

  const nextTurn = (state.currentTurnSeat + 1) % state.playerCount;

  // If next turn returns to the owner, the table is cleared and round ends!
  if (nextTurn === ownerSeat) {
    const nextState: ScoutRoundState = {
      ...state,
      hands: updatedHands,
      activeSet: null,
      phase: "round_over",
      roundEndReason: "table_cleared",
      winningSeatIndex: ownerSeat,
      history: [
        ...state.history,
        `${state.playerNames[hand.seatIndex]} scouted a card. Table cleared back to ${state.playerNames[ownerSeat]}! Round over.`,
      ],
    };
    const breakdowns = calculateRoundScores(nextState);
    nextState.roundScores = breakdowns.map((b) => b.totalRoundScore);
    return nextState;
  }

  // Update active set if cards still remain, otherwise clear
  let updatedActiveSet: ActiveSet | null = null;
  if (remainingActiveCards.length > 0) {
    const reevaluated = evaluateCombination(remainingActiveCards);
    if (reevaluated) {
      updatedActiveSet = {
        combination: reevaluated,
        ownerSeatIndex: ownerSeat,
      };
    }
  }

  return {
    ...state,
    hands: updatedHands,
    activeSet: updatedActiveSet,
    currentTurnSeat: nextTurn,
    history: [
      ...state.history,
      `${state.playerNames[hand.seatIndex]} scouted a card from ${state.playerNames[ownerSeat]}'s set.`,
    ],
  };
}

function executeScoutAndShow(
  state: ScoutRoundState,
  hand: PlayerHand,
  takeFrom: "left" | "right",
  insertAtIndex: number,
  useTop: boolean,
  showCardIndices: number[],
): ScoutRoundState | ActionError {
  const scoutResult = executeScout(
    state,
    hand,
    takeFrom,
    insertAtIndex,
    useTop,
  );
  if ("error" in scoutResult) return scoutResult;

  // Mark Scout & Show used
  const updatedHands = scoutResult.hands.map((h) =>
    h.seatIndex === hand.seatIndex
      ? { ...h, hasScoutAndShowAvailable: false }
      : h,
  );

  const scoutedState: ScoutRoundState = {
    ...scoutResult,
    hands: updatedHands,
    currentTurnSeat: hand.seatIndex, // Keep turn on current player for SHOW
  };

  const updatedHand = scoutedState.hands[hand.seatIndex]!;
  return executeShow(scoutedState, updatedHand, showCardIndices);
}
