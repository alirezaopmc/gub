import type { EventBadgeKind, FourteenSuit, RoundEvent } from "@/lib/games/skull-king/round-score/types"

export type RoundEventDisplay = {
  badgeKind: EventBadgeKind
  /** 1–2 characters for the chip */
  label: string
  /** Tooltip / full description */
  title: string
  /** 14-bonus only: which suit (drives chip border + text color). */
  fourteenSuit?: FourteenSuit
}

/** Points shown on the 14-bonus chip: black 14s are +20, other suits +10. */
function fourteenBonusLabel(suit: FourteenSuit): "10" | "20" {
  return suit === "black" ? "20" : "10"
}

/** 1-based seat label for event chips (e.g. #1, #2). */
function playerSeat(i: number): string {
  return `#${i + 1}`
}

/** `rowPlayerIndex`: when set, Alliance chips show only the ally’s seat (#n) on that row. */
export function getRoundEventDisplay(
  event: RoundEvent,
  playerNames: readonly string[],
  rowPlayerIndex?: number
): RoundEventDisplay {
  const name = (i: number) => playerNames[i]?.trim() || `P${i + 1}`

  switch (event.type) {
    case "legacy":
      return {
        badgeKind: mapLegacyToBadgeKind(event.kind),
        label: event.label.slice(0, 2),
        title: event.label,
      }
    case "alliance": {
      const loot = event.lootPlayerIndex
      const win = event.trickWinnerIndex
      const left = playerSeat(loot)
      const right = playerSeat(win)
      let label: string
      if (rowPlayerIndex === loot) {
        label = playerSeat(win)
      } else if (rowPlayerIndex === win) {
        label = playerSeat(loot)
      } else {
        label = `${left}·${right}`
      }
      return {
        badgeKind: "alliance",
        label,
        title: `Alliance: ${left} ${name(loot)} (Loot) & ${right} ${name(win)} (won trick)`,
      }
    }
    case "pirateAbility": {
      return {
        badgeKind: "pirate",
        label: String(event.wager),
        title: `Rascal of Roatan: wager ${event.wager} pts (${name(event.ownerIndex)})`,
      }
    }
    case "characterCapture": {
      const cap = event.capturingCard
      const victim = cap === "pirate" ? "Mermaid" : cap === "mermaid" ? "Skull King" : "Pirate"
      const short = cap === "pirate" ? "P→" : cap === "mermaid" ? "M→" : "K→"
      const n = event.count ?? 1
      const cnt = n >= 2 ? `×${n}` : ""
      return {
        badgeKind: "capture",
        label: `${short}${cnt}`,
        title: `${name(event.capturerIndex)} captured (${cap} takes ${victim})${n >= 2 ? ` ×${n}` : ""}`,
      }
    }
    case "fourteenBonus": {
      const pts = fourteenBonusLabel(event.suit)
      return {
        badgeKind: "fourteen",
        label: pts,
        title: `14 bonus (+${pts}) · ${name(event.playerIndex)} · ${event.suit}`,
        fourteenSuit: event.suit,
      }
    }
    default: {
      const _exhaustive: never = event
      return _exhaustive
    }
  }
}

function mapLegacyToBadgeKind(kind: import("@/lib/games/skull-king/round-score/types").LegacyEventKind): EventBadgeKind {
  switch (kind) {
    case "coin":
      return "coin"
    case "skull":
      return "skull"
    case "trump":
      return "trump"
    case "bonus":
      return "bonus"
    case "kraken":
      return "kraken"
    case "pirate":
      return "pirate"
    default: {
      const _e: never = kind
      return _e
    }
  }
}
