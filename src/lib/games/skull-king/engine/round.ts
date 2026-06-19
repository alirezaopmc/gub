import { leftOf } from "./deal"
import { removeCardFromHand } from "./deck"
import { isLegalPlay } from "./legal-moves"
import { createPendingAbility } from "./pirate-abilities"
import { scoreRoundFromState } from "./scoring-bridge"
import { createPlayedCard, resolveLootLeadAllEscapes, resolveTrick } from "./trick-resolution"
import type {
  Card,
  MatchConfig,
  PendingAbility,
  PlayerBid,
  RoundState,
  TigressMode,
  TrickResult,
} from "./types"

export function createEmptyBids(count: number): PlayerBid[] {
  return Array.from({ length: count }, (): PlayerBid => ({ bid: null, harryGiantDelta: null }))
}

export function createRoundState(params: {
  roundIndex: number
  handSize: number
  dealerIndex: number
  hands: Card[][]
  undealt: Card[]
}): RoundState {
  const playerCount = params.hands.length
  const leaderIndex = leftOf(params.dealerIndex, playerCount)
  return {
    roundIndex: params.roundIndex,
    handSize: params.handSize,
    dealerIndex: params.dealerIndex,
    leaderIndex,
    phase: "bidding",
    hands: params.hands,
    undealt: params.undealt,
    bids: createEmptyBids(playerCount),
    tricksWon: Array(playerCount).fill(0),
    currentTrick: [],
    trickLeaderIndex: leaderIndex,
    completedTricks: [],
    pendingAbility: null,
    nextLeaderOverride: null,
    juanitaPeekPlayer: null,
    rascalWager: null,
    roundScores: null,
  }
}

export function allBidsSubmitted(round: RoundState): boolean {
  return round.bids.every((b) => b.bid !== null)
}

/** Seat index whose turn it is to play a card (playing phase only). */
export function getExpectedTurnSeat(round: RoundState, playerCount: number): number {
  if (round.phase !== "playing" || round.pendingAbility) return -1
  if (round.currentTrick.length === 0) return round.trickLeaderIndex
  return (round.currentTrick[round.currentTrick.length - 1]!.playerIndex + 1) % playerCount
}

export function effectiveBid(bid: PlayerBid, handSize: number): number {
  const base = bid.bid ?? 0
  const delta = bid.harryGiantDelta ?? 0
  return Math.max(0, Math.min(handSize, base + delta))
}

export type PlayCardResult =
  | { complete: false; round: RoundState }
  | { complete: true; round: RoundState; trick: TrickResult }

function nextSeatAfter(current: number, playerCount: number): number {
  return (current + 1) % playerCount
}

function pirateWonWith(play: import("./types").PlayedCard): import("./types").PirateId | null {
  const { card, tigressMode } = play
  if (card.def.kind === "pirate") return card.def.pirate
  if (card.def.kind === "tigress" && tigressMode === "pirate") return "rosie"
  return null
}

export function playCardOnRound(
  round: RoundState,
  playerIndex: number,
  cardId: string,
  playerCount: number,
  artifacts: MatchConfig["artifacts"],
  tigressMode?: TigressMode
): PlayCardResult | { error: string } {
  if (round.phase !== "playing") return { error: "not_playing" }
  if (round.pendingAbility) return { error: "ability_pending" }

  const expectedPlayer =
    round.currentTrick.length === 0
      ? round.trickLeaderIndex
      : nextSeatAfter(round.currentTrick[round.currentTrick.length - 1]!.playerIndex, playerCount)

  if (playerIndex !== expectedPlayer) return { error: "not_your_turn" }

  const hand = round.hands[playerIndex]!
  if (!isLegalPlay(hand, round.currentTrick, cardId, tigressMode)) {
    return { error: "illegal_card" }
  }

  const card = removeCardFromHand(hand, cardId)
  if (!card) return { error: "card_not_found" }

  const play = createPlayedCard(card, playerIndex, round.currentTrick.length, tigressMode)
  const currentTrick = [...round.currentTrick, play]

  if (currentTrick.length < playerCount) {
    return {
      complete: false,
      round: {
        ...round,
        hands: round.hands.map((h, i) => (i === playerIndex ? hand : h)),
        currentTrick,
      },
    }
  }

  const lootWin = resolveLootLeadAllEscapes(currentTrick)
  const trick: TrickResult =
    lootWin !== null
      ? { outcome: { type: "won", winnerIndex: lootWin, plays: currentTrick }, captures: [] }
      : resolveTrick(currentTrick, playerCount)

  const tricksWon = [...round.tricksWon]
  const trickIndex = round.completedTricks.length
  const isFinalTrick = trickIndex + 1 === round.handSize
  let nextLeader: number
  let pendingAbility: PendingAbility | null = null

  if (trick.outcome.type === "won") {
    tricksWon[trick.outcome.winnerIndex] = (tricksWon[trick.outcome.winnerIndex] ?? 0) + 1
    nextLeader = trick.outcome.winnerIndex

    const winnerIndex = trick.outcome.winnerIndex
    const winPlay = currentTrick.find((p) => p.playerIndex === winnerIndex)
    if (winPlay && artifacts.pirateAbilities) {
      const pirate = pirateWonWith(winPlay)
      if (pirate) {
        pendingAbility = createPendingAbility(
          pirate,
          trick.outcome.winnerIndex,
          trickIndex,
          isFinalTrick,
          true
        )
      }
    }
  } else {
    nextLeader = trick.outcome.wouldBeWinnerIndex
  }

  if (round.nextLeaderOverride !== null && !pendingAbility) {
    nextLeader = round.nextLeaderOverride
  }

  const completedTricks = [...round.completedTricks, trick]
  let phase: RoundState["phase"] = "playing"
  if (pendingAbility) phase = "ability"
  else if (completedTricks.length >= round.handSize) phase = "scoring"

  return {
    complete: true,
    round: {
      ...round,
      hands: round.hands.map((h, i) => (i === playerIndex ? hand : h)),
      currentTrick: [],
      trickLeaderIndex: pendingAbility ? nextLeader : nextLeader,
      tricksWon,
      completedTricks,
      pendingAbility,
      nextLeaderOverride: null,
      phase,
    },
    trick,
  }
}

export function finalizeRoundScoring(round: RoundState, config: MatchConfig): RoundState {
  const scores = scoreRoundFromState(round, {
    fourteenBonus: config.artifacts.fourteenBonus,
    characterCapture: config.artifacts.characterCapture,
    loot: config.artifacts.loot,
  })
  return { ...round, roundScores: scores, phase: "scoring" }
}

/** First trick leader of round N becomes dealer for round N+1 (rulebook p.10). */
export function nextRoundDealer(round: RoundState): number {
  return round.leaderIndex
}

export function submitBidOnRound(
  round: RoundState,
  playerIndex: number,
  bid: number
): RoundState | { error: string } {
  if (round.phase !== "bidding") return { error: "not_bidding" }
  if (bid < 0 || bid > round.handSize) return { error: "invalid_bid" }
  const bids = round.bids.map((b, i) => (i === playerIndex ? { ...b, bid } : b))
  const next = { ...round, bids }
  if (allBidsSubmitted(next)) {
    return { ...next, phase: "playing", trickLeaderIndex: round.leaderIndex }
  }
  return next
}

export function resolveAbilityOnRound(
  round: RoundState,
  playerCount: number,
  resolution: import("./match-reducer").AbilityResolution
): RoundState | { error: string } {
  const pending = round.pendingAbility
  if (!pending || round.phase !== "ability") return { error: "ability_not_pending" }

  let updated: RoundState = { ...round, pendingAbility: null, phase: "playing" }

  switch (resolution.type) {
    case "rosie":
      updated = { ...updated, nextLeaderOverride: resolution.nextLeaderIndex }
      break
    case "bendt": {
      const hand = [...updated.hands[pending.winnerIndex]!]
      const drawn = resolution.drawCardIds
        .map((id) => updated.undealt.find((c) => c.id === id))
        .filter((c): c is Card => !!c)
      const undealt = updated.undealt.filter((c) => !drawn.some((d) => d.id === c.id))
      for (const d of drawn) hand.push(d)
      for (const id of resolution.discardCardIds) {
        const idx = hand.findIndex((c) => c.id === id)
        if (idx >= 0) hand.splice(idx, 1)
      }
      const hands = updated.hands.map((h, i) => (i === pending.winnerIndex ? hand : h))
      updated = { ...updated, hands, undealt }
      break
    }
    case "rascal":
      updated = {
        ...updated,
        rascalWager: { playerIndex: pending.winnerIndex, wager: resolution.wager },
      }
      break
    case "juanita":
      updated = { ...updated, juanitaPeekPlayer: pending.winnerIndex }
      break
    case "harry": {
      const bids = updated.bids.map((b, i) =>
        i === pending.winnerIndex
          ? {
              ...b,
              harryGiantDelta:
                resolution.delta === 0 ? null : (resolution.delta as 1 | -1),
            }
          : b
      )
      updated = { ...updated, bids }
      break
    }
  }

  if (updated.completedTricks.length >= updated.handSize && !updated.pendingAbility) {
    updated = { ...updated, phase: "scoring" }
  }

  void playerCount
  return updated
}
