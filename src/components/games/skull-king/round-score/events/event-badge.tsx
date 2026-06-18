import { EventBadgeIcon } from "@/components/icons/skull-king/event-badge-icon"
import type { EventBadgeKind, FourteenSuit } from "@/lib/games/skull-king/round-score/types"
import { cn } from "@/lib/utils"

import styles from "./event-badge.module.css"

export type EventBadgeProps = {
  badgeKind: EventBadgeKind
  label: string
  title: string
  /** 14-bonus: suit for border + text color (default emerald if omitted). */
  fourteenSuit?: FourteenSuit
  className?: string
}

const SUIT_SURFACE: Record<FourteenSuit, string> = {
  green: styles.suitGreen,
  yellow: styles.suitYellow,
  purple: styles.suitPurple,
  black: styles.suitBlack,
}

function kindTone(kind: EventBadgeKind): string {
  switch (kind) {
    case "coin":
      return "border-primary/70 text-primary"
    case "skull":
      return "border-destructive/60 text-destructive"
    case "trump":
      return "border-foreground/35 text-foreground"
    case "bonus":
      return "border-secondary text-secondary-foreground"
    case "kraken":
      return "border-muted-foreground/50 text-muted-foreground"
    case "pirate":
      return "border-primary/45 text-foreground"
    case "alliance":
      return "border-primary/60 text-primary"
    case "capture":
      return styles.toneCapture
    case "fourteen":
      return styles.toneFourteen
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function EventBadge({ badgeKind, label, title, fourteenSuit, className }: EventBadgeProps) {
  const maxLen = badgeKind === "alliance" ? 4 : 2
  const safe = label.slice(0, maxLen)
  const fourteenSuitFill = badgeKind === "fourteen" && fourteenSuit != null

  const chipSurface =
    fourteenSuitFill && fourteenSuit != null
      ? SUIT_SURFACE[fourteenSuit]
      : cn("bg-card", kindTone(badgeKind))

  return (
    <span
      className={cn(
        "inline-flex max-w-[3.25rem] items-center gap-1 rounded-md border px-1 py-px",
        chipSurface,
        className
      )}
      title={title}
    >
      <EventBadgeIcon kind={badgeKind} className="size-3.5 shrink-0" />
      <span className="font-mono text-[0.625rem] font-semibold leading-none tracking-tight">{safe}</span>
    </span>
  )
}
