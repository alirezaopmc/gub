import { clampCharacterCaptureCount } from "@/lib/games/skull-king/round-score/score-rules"
import type { FourteenSuit, LegacyEventKind, RoundData, RoundEvent } from "@/lib/games/skull-king/round-score/types"

const LEGACY_KINDS = new Set<LegacyEventKind>(["coin", "skull", "trump", "bonus", "kraken", "pirate"])

function isLegacyEventKind(s: string): s is LegacyEventKind {
  return LEGACY_KINDS.has(s as LegacyEventKind)
}

function isFourteenSuit(s: unknown): s is FourteenSuit {
  return s === "green" || s === "yellow" || s === "purple" || s === "black"
}

function readLoggedAt(o: Record<string, unknown>): number | undefined {
  return typeof o.loggedAt === "number" && Number.isFinite(o.loggedAt) ? o.loggedAt : undefined
}

/** Deserialize one event; unknown shapes become a safe legacy placeholder. */
function parseRoundEvent(raw: unknown): RoundEvent {
  if (!raw || typeof raw !== "object") {
    return { type: "legacy", kind: "coin", label: "?" }
  }
  const o = raw as Record<string, unknown>
  const at = readLoggedAt(o)
  if (typeof o.type !== "string") {
    return { type: "legacy", kind: "coin", label: "?" }
  }
  if (o.type === "legacy" && typeof o.label === "string" && typeof o.kind === "string" && isLegacyEventKind(o.kind)) {
    return { type: "legacy", kind: o.kind, label: o.label, ...(at != null ? { loggedAt: at } : {}) }
  }
  if (o.type === "alliance" && typeof o.lootPlayerIndex === "number" && typeof o.trickWinnerIndex === "number") {
    return {
      type: "alliance",
      lootPlayerIndex: o.lootPlayerIndex,
      trickWinnerIndex: o.trickWinnerIndex,
      ...(at != null ? { loggedAt: at } : {}),
    }
  }
  if (o.type === "pirateAbility" && o.pirate === "rascal" && (o.wager === 10 || o.wager === 20) && typeof o.ownerIndex === "number") {
    return {
      type: "pirateAbility",
      ownerIndex: o.ownerIndex,
      pirate: "rascal",
      wager: o.wager,
      ...(at != null ? { loggedAt: at } : {}),
    }
  }
  if (
    o.type === "characterCapture" &&
    (o.capturingCard === "pirate" || o.capturingCard === "mermaid" || o.capturingCard === "king") &&
    typeof o.capturerIndex === "number"
  ) {
    const rawCount = o.count
    const count = clampCharacterCaptureCount(
      o.capturingCard,
      typeof rawCount === "number" && Number.isFinite(rawCount) ? rawCount : 1,
    )
    return {
      type: "characterCapture",
      capturerIndex: o.capturerIndex,
      capturingCard: o.capturingCard,
      count,
      ...(at != null ? { loggedAt: at } : {}),
    }
  }
  if (o.type === "fourteenBonus" && typeof o.playerIndex === "number" && isFourteenSuit(o.suit)) {
    return { type: "fourteenBonus", playerIndex: o.playerIndex, suit: o.suit, ...(at != null ? { loggedAt: at } : {}) }
  }
  return { type: "legacy", kind: "coin", label: "?" }
}

/**
 * Build `RoundData[]` from localStorage JSON. Invalid rows get safe defaults; events must match the current
 * `RoundEvent` union (dev — no old on-disk format branches).
 */
export function parsePersistedRounds(rounds: unknown): RoundData[] {
  if (!Array.isArray(rounds)) return []
  return rounds.map((r) => {
    if (!r || typeof r !== "object" || !("players" in r)) {
      return { finalized: false, bidsSheetDismissed: false, players: [] }
    }
    const raw = r as { players: unknown; finalized?: unknown; bidsSheetDismissed?: unknown }
    const pl = raw.players
    if (!Array.isArray(pl)) return { finalized: false, bidsSheetDismissed: false, players: [] }
    return {
      finalized: typeof raw.finalized === "boolean" ? raw.finalized : false,
      bidsSheetDismissed: typeof raw.bidsSheetDismissed === "boolean" ? raw.bidsSheetDismissed : false,
      players: pl.map((p, playerIndex) => {
        if (!p || typeof p !== "object" || !("events" in p)) {
          return { bid: null, won: null, events: [], harryGiantBidDelta: null, score: 0 }
        }
        const pr = p as {
          bid: unknown
          won: unknown
          events: unknown
          score: unknown
          harryGiantBidDelta?: unknown
        }
        const evList = Array.isArray(pr.events) ? pr.events : []
        let fromHarryEvent: 1 | -1 | null = null
        const kept: unknown[] = []
        for (const ev of evList) {
          if (!ev || typeof ev !== "object") {
            kept.push(ev)
            continue
          }
          const o = ev as Record<string, unknown>
          if (
            o.type === "pirateAbility" &&
            o.pirate === "harry" &&
            (o.bidDelta === 1 || o.bidDelta === -1) &&
            typeof o.ownerIndex === "number" &&
            o.ownerIndex === playerIndex
          ) {
            fromHarryEvent = o.bidDelta
            continue
          }
          kept.push(ev)
        }
        const events = kept.map(parseRoundEvent)
        const stored = pr.harryGiantBidDelta
        const fromStored: 1 | -1 | null = stored === 1 || stored === -1 ? stored : null
        return {
          bid: typeof pr.bid === "number" || pr.bid === null ? (pr.bid as number | null) : null,
          won: typeof pr.won === "number" || pr.won === null ? (pr.won as number | null) : null,
          score: typeof pr.score === "number" && Number.isFinite(pr.score) ? pr.score : 0,
          events,
          harryGiantBidDelta: fromStored ?? fromHarryEvent,
        }
      }),
    }
  })
}
