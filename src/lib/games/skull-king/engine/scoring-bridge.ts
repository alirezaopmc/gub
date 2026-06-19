import { effectiveTricksBid } from "@/lib/games/skull-king/round-score/bid-won-validation"
import {
  computeRoundScoreBreakdown,
  type ScoreBreakdownContext,
} from "@/lib/games/skull-king/round-score/score-rules"
import type { PlayerRoundData, RoundEvent } from "@/lib/games/skull-king/round-score/types"
import type { CaptureBonus, MatchConfig, PlayerRoundResult, RoundState, TrickResult } from "./types"

function captureToEvent(c: CaptureBonus, capturerIndex: number): RoundEvent {
  switch (c.type) {
    case "fourteen":
      return { type: "fourteenBonus", playerIndex: capturerIndex, suit: c.suit }
    case "mermaid_by_pirate":
      return {
        type: "characterCapture",
        capturerIndex,
        capturingCard: "pirate",
        count: 1,
      }
    case "pirate_by_king":
      return {
        type: "characterCapture",
        capturerIndex,
        capturingCard: "king",
        count: 1,
      }
    case "king_by_mermaid":
      return {
        type: "characterCapture",
        capturerIndex,
        capturingCard: "mermaid",
        count: 1,
      }
  }
}

export function buildRoundEventsFromTricks(
  tricks: TrickResult[],
  playerCount: number,
  options: {
    fourteenBonus: boolean
    characterCapture: boolean
    loot: boolean
  }
): RoundEvent[][] {
  const events: RoundEvent[][] = Array.from({ length: playerCount }, () => [])

  for (const trick of tricks) {
    if (trick.outcome.type !== "won") continue
    const winner = trick.outcome.winnerIndex

    if (options.fourteenBonus) {
      for (const cap of trick.captures) {
        if (cap.type === "fourteen") {
          events[winner]!.push(captureToEvent(cap, winner))
        }
      }
    }

    if (options.characterCapture) {
      for (const cap of trick.captures) {
        if (cap.type !== "fourteen") {
          events[winner]!.push(captureToEvent(cap, winner))
        }
      }
    }

    if (options.loot && trick.lootAlliance) {
      const { lootPlayerIndex, trickWinnerIndex } = trick.lootAlliance
      const e: RoundEvent = {
        type: "alliance",
        lootPlayerIndex,
        trickWinnerIndex,
      }
      events[lootPlayerIndex]!.push(e)
      events[trickWinnerIndex]!.push(e)
    }
  }

  return events
}

export function roundStateToPlayerRoundData(
  round: RoundState,
  trickEvents: RoundEvent[][]
): PlayerRoundData[] {
  return round.bids.map((b, i) => ({
    bid: b.bid,
    won: round.tricksWon[i] ?? null,
    harryGiantBidDelta: b.harryGiantDelta,
    events: [
      ...(trickEvents[i] ?? []),
      ...(round.rascalWager?.playerIndex === i
        ? [
            {
              type: "pirateAbility" as const,
              ownerIndex: i,
              pirate: "rascal" as const,
              wager: round.rascalWager.wager === 0 ? (10 as const) : round.rascalWager.wager,
            },
          ].filter(() => round.rascalWager!.wager !== 0)
        : []),
    ],
    score: 0,
  }))
}

export function computeRoundScores(
  round: RoundState,
  trickEvents: RoundEvent[][],
  fourteenBonus: boolean,
  characterCapture: boolean
): number[] {
  const players = roundStateToPlayerRoundData(round, trickEvents)
  const handSize = round.handSize

  return players.map((player, playerIndex) => {
    const eff = effectiveTricksBid(handSize, player.bid, player.harryGiantBidDelta)
    const madeBid = eff !== null && player.won !== null && eff === player.won

    const filteredEvents = player.events.filter((e) => {
      if (!madeBid) return false
      if (e.type === "fourteenBonus" && !fourteenBonus) return false
      if (e.type === "characterCapture" && !characterCapture) return false
      return true
    })

    const ctx: ScoreBreakdownContext = {
      handSize,
      playerIndex,
      player: { ...player, events: filteredEvents },
      roundPlayers: players.map((p, i) =>
        i === playerIndex ? { ...p, events: filteredEvents } : { ...p, events: madeBid ? p.events : [] }
      ),
    }

    const breakdown = computeRoundScoreBreakdown({
      ...ctx,
      player: { ...ctx.player, events: filteredEvents },
    })

    return breakdown.total
  })
}

export function scoreRoundFromState(
  round: RoundState,
  config: {
    fourteenBonus: boolean
    characterCapture: boolean
    loot: boolean
  }
): number[] {
  const trickEvents = buildRoundEventsFromTricks(
    round.completedTricks,
    round.bids.length,
    config
  )
  return computeRoundScores(round, trickEvents, config.fourteenBonus, config.characterCapture)
}

export function buildPlayerRoundResults(
  round: RoundState,
  config: MatchConfig
): PlayerRoundResult[] {
  const trickEvents = buildRoundEventsFromTricks(
    round.completedTricks,
    round.bids.length,
    config.artifacts
  )
  const players = roundStateToPlayerRoundData(round, trickEvents)
  const handSize = round.handSize
  const { fourteenBonus, characterCapture } = config.artifacts

  return players.map((player, playerIndex) => {
    const eff = effectiveTricksBid(handSize, player.bid, player.harryGiantBidDelta)
    const madeBid = eff !== null && player.won !== null && eff === player.won

    const filteredEvents = player.events.filter((e) => {
      if (!madeBid) return false
      if (e.type === "fourteenBonus" && !fourteenBonus) return false
      if (e.type === "characterCapture" && !characterCapture) return false
      return true
    })

    const roundPlayers = players.map((p, i) =>
      i === playerIndex
        ? { ...p, events: filteredEvents }
        : { ...p, events: madeBid ? p.events : [] }
    )

    const breakdown = computeRoundScoreBreakdown({
      handSize,
      playerIndex,
      player: { ...player, events: filteredEvents },
      roundPlayers,
    })

    return {
      seatIndex: playerIndex,
      bid: player.bid,
      won: player.won ?? 0,
      main: breakdown.main,
      bonus: breakdown.bonus,
      total: breakdown.total,
      madeBid,
    }
  })
}
