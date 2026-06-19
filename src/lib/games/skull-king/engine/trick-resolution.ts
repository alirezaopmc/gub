import { isEscapeLike } from "./cards"
import { resolveLeadContext } from "./lead-suit"
import { trickHasOnlyEscapeLike } from "./legal-moves"
import type {
  CaptureBonus,
  Card,
  PlayedCard,
  StandardSuit,
  TrickOutcome,
  TrickResult,
} from "./types"

type CardRole =
  | { role: "escape" }
  | { role: "suited"; suit: StandardSuit; rank: number }
  | { role: "pirate" }
  | { role: "skull_king" }
  | { role: "mermaid" }
  | { role: "kraken" }
  | { role: "whale" }
  | { role: "loot" }

function cardRole(play: PlayedCard): CardRole {
  const { card, tigressMode } = play
  if (isEscapeLike(card, tigressMode)) return { role: "escape" }
  switch (card.def.kind) {
    case "suited":
      return { role: "suited", suit: card.def.suit, rank: card.def.rank }
    case "pirate":
      return { role: "pirate" }
    case "skull_king":
      return { role: "skull_king" }
    case "mermaid":
      return { role: "mermaid" }
    case "kraken":
      return { role: "kraken" }
    case "whale":
      return { role: "whale" }
    case "loot":
      return { role: "loot" }
    case "tigress":
      return tigressMode === "pirate" ? { role: "pirate" } : { role: "escape" }
    default:
      return { role: "escape" }
  }
}

function hasRole(plays: PlayedCard[], role: CardRole["role"]): boolean {
  return plays.some((p) => cardRole(p).role === role)
}

function competingSuited(play: PlayedCard, leadSuit: StandardSuit): boolean {
  const r = cardRole(play)
  if (r.role !== "suited") return false
  if (r.suit === leadSuit) return true
  if (leadSuit !== "black" && r.suit === "black") return true
  if (leadSuit === "black" && r.suit === "black") return true
  return false
}

function compareSuited(a: PlayedCard, b: PlayedCard, leadSuit: StandardSuit): number {
  const ra = cardRole(a)
  const rb = cardRole(b)
  if (ra.role !== "suited" || rb.role !== "suited") return 0

  const aTrump = ra.suit === "black" && leadSuit !== "black"
  const bTrump = rb.suit === "black" && leadSuit !== "black"

  if (aTrump && !bTrump) return 1
  if (bTrump && !aTrump) return -1
  if (ra.suit === leadSuit && rb.suit !== leadSuit) return 1
  if (rb.suit === leadSuit && ra.suit !== leadSuit) return -1
  return ra.rank - rb.rank
}

function beatsSpecial(a: CardRole["role"], b: CardRole["role"]): boolean {
  if (a === b) return false
  if (a === "pirate" && b === "mermaid") return true
  if (a === "mermaid" && b === "skull_king") return true
  if (a === "skull_king" && b === "pirate") return true
  if (b === "pirate" && a === "mermaid") return false
  if (b === "mermaid" && a === "skull_king") return false
  if (b === "skull_king" && a === "pirate") return false
  return false
}

function compareSpecialWinner(a: PlayedCard, b: PlayedCard): number {
  const ra = cardRole(a).role
  const rb = cardRole(b).role
  if (ra === "escape" || ra === "loot" || rb === "escape" || rb === "loot") {
    return a.playOrder < b.playOrder ? 1 : -1
  }
  if (ra === rb) {
    return a.playOrder < b.playOrder ? 1 : a.playOrder > b.playOrder ? -1 : 0
  }
  if (beatsSpecial(ra, rb)) return 1
  if (beatsSpecial(rb, ra)) return -1
  return a.playOrder < b.playOrder ? 1 : -1
}

function tripleMermaidWins(plays: PlayedCard[]): PlayedCard | null {
  if (!hasRole(plays, "pirate") || !hasRole(plays, "skull_king") || !hasRole(plays, "mermaid")) {
    return null
  }
  return plays.find((p) => cardRole(p).role === "mermaid") ?? null
}

function resolveWhaleWinner(plays: PlayedCard[]): PlayedCard | null {
  const numbered = plays.filter((p) => cardRole(p).role === "suited")
  if (numbered.length === 0) return null
  let best = numbered[0]!
  for (let i = 1; i < numbered.length; i++) {
    const c = numbered[i]!
    const ra = cardRole(c) as { role: "suited"; rank: number }
    const rb = cardRole(best) as { role: "suited"; rank: number }
    if (ra.rank > rb.rank) best = c
    else if (ra.rank === rb.rank && c.playOrder < best.playOrder) best = c
  }
  return best
}

function resolveNormalWinner(plays: PlayedCard[]): PlayedCard {
  const triple = tripleMermaidWins(plays)
  if (triple) return triple

  if (trickHasOnlyEscapeLike(plays)) {
    return plays.reduce((a, b) => (a.playOrder < b.playOrder ? a : b))
  }

  const ctx = resolveLeadContext(plays)
  const leadSuit = ctx.leadSuit

  const competing: PlayedCard[] = []
  for (const p of plays) {
    const r = cardRole(p)
    if (r.role === "escape" || r.role === "loot") continue
    if (r.role === "pirate" || r.role === "skull_king" || r.role === "mermaid") {
      competing.push(p)
      continue
    }
    if (r.role === "suited" && leadSuit) {
      if (competingSuited(p, leadSuit)) competing.push(p)
    }
  }

  if (competing.length === 0) {
    return plays.reduce((a, b) => (a.playOrder < b.playOrder ? a : b))
  }

  let best = competing[0]!
  for (let i = 1; i < competing.length; i++) {
    const c = competing[i]!
    const br = cardRole(best)
    const cr = cardRole(c)

    const bestIsSpecial = br.role === "pirate" || br.role === "skull_king" || br.role === "mermaid"
    const cIsSpecial = cr.role === "pirate" || cr.role === "skull_king" || cr.role === "mermaid"

    if (bestIsSpecial && cIsSpecial) {
      if (compareSpecialWinner(c, best) > 0) best = c
    } else if (cIsSpecial && !bestIsSpecial) {
      best = c
    } else if (bestIsSpecial && !cIsSpecial) {
      // keep best
    } else if (leadSuit && br.role === "suited" && cr.role === "suited") {
      if (compareSuited(c, best, leadSuit) > 0) best = c
    }
  }

  return best
}

function krakenWhaleOrder(plays: PlayedCard[]): { kraken: PlayedCard | null; whale: PlayedCard | null } {
  let kraken: PlayedCard | null = null
  let whale: PlayedCard | null = null
  for (const p of plays) {
    if (p.card.def.kind === "kraken") kraken = p
    if (p.card.def.kind === "whale") whale = p
  }
  return { kraken, whale }
}

function detectCaptures(plays: PlayedCard[], winner: PlayedCard): CaptureBonus[] {
  const captures: CaptureBonus[] = []
  const winnerRole = cardRole(winner).role

  for (const p of plays) {
    if (p.card.def.kind === "suited" && p.card.def.rank === 14) {
      captures.push({
        type: "fourteen",
        suit: p.card.def.suit,
        trickWinnerIndex: winner.playerIndex,
      })
    }
  }

  const hasPirate = plays.some((p) => cardRole(p).role === "pirate")
  const hasKing = plays.some((p) => cardRole(p).role === "skull_king")
  const hasMermaid = plays.some((p) => cardRole(p).role === "mermaid")

  if (winnerRole === "mermaid" && hasKing) {
    captures.push({ type: "king_by_mermaid", trickWinnerIndex: winner.playerIndex })
  } else if (winnerRole === "skull_king" && hasPirate) {
    captures.push({ type: "pirate_by_king", trickWinnerIndex: winner.playerIndex })
  } else if (winnerRole === "pirate" && hasMermaid) {
    captures.push({ type: "mermaid_by_pirate", trickWinnerIndex: winner.playerIndex })
  }

  return captures
}

function lootAlliance(plays: PlayedCard[], winner: PlayedCard): { lootPlayerIndex: number; trickWinnerIndex: number } | undefined {
  const lootPlay = plays.find((p) => p.card.def.kind === "loot")
  if (!lootPlay) return undefined
  if (winner.playerIndex === lootPlay.playerIndex) return undefined
  return { lootPlayerIndex: lootPlay.playerIndex, trickWinnerIndex: winner.playerIndex }
}

export function resolveTrick(plays: PlayedCard[], playerCount: number): TrickResult {
  const sorted = [...plays].sort((a, b) => a.playOrder - b.playOrder)
  const { kraken, whale } = krakenWhaleOrder(sorted)

  let outcome: TrickOutcome
  let winner: PlayedCard | null = null

  if (kraken && whale) {
    const second = kraken.playOrder > whale.playOrder ? kraken : whale
    if (second.card.def.kind === "kraken") {
      const wouldBe = resolveNormalWinner(sorted.filter((p) => p.card.def.kind !== "kraken" && p.card.def.kind !== "whale"))
      outcome = { type: "destroyed", wouldBeWinnerIndex: wouldBe.playerIndex, plays: sorted }
    } else {
      winner = resolveWhaleWinner(sorted)
      if (!winner) {
        const wouldBe = resolveNormalWinner(sorted)
        outcome = { type: "discarded", wouldBeWinnerIndex: wouldBe.playerIndex, plays: sorted }
      } else {
        outcome = { type: "won", winnerIndex: winner.playerIndex, plays: sorted }
      }
    }
  } else if (kraken) {
    const wouldBe = resolveNormalWinner(sorted.filter((p) => p.card.def.kind !== "kraken"))
    outcome = { type: "destroyed", wouldBeWinnerIndex: wouldBe.playerIndex, plays: sorted }
  } else if (whale) {
    winner = resolveWhaleWinner(sorted)
    if (!winner) {
      const wouldBe = resolveNormalWinner(sorted)
      outcome = { type: "discarded", wouldBeWinnerIndex: wouldBe.playerIndex, plays: sorted }
    } else {
      outcome = { type: "won", winnerIndex: winner.playerIndex, plays: sorted }
    }
  } else {
    winner = resolveNormalWinner(sorted)
    outcome = { type: "won", winnerIndex: winner.playerIndex, plays: sorted }
  }

  const captures =
    outcome.type === "won" && winner
      ? detectCaptures(sorted, winner)
      : []

  const alliance =
    outcome.type === "won" && winner ? lootAlliance(sorted, winner) : undefined

  void playerCount

  return { outcome, captures, lootAlliance: alliance }
}

/** Loot leads + all others escape-like → loot player wins, no alliance. */
export function resolveLootLeadAllEscapes(plays: PlayedCard[]): number | null {
  if (plays.length === 0) return null
  const first = plays[0]!
  if (first.card.def.kind !== "loot") return null
  const rest = plays.slice(1)
  if (rest.length === 0) return first.playerIndex
  if (rest.every((p) => isEscapeLike(p.card, p.tigressMode))) {
    return first.playerIndex
  }
  return null
}

export function createPlayedCard(
  card: Card,
  playerIndex: number,
  playOrder: number,
  tigressMode?: "pirate" | "escape"
): PlayedCard {
  return { card, playerIndex, playOrder, tigressMode }
}
