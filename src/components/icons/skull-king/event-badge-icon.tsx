import type { EventBadgeKind } from "@/lib/games/skull-king/round-score/types"

import type { IconProps } from "@/components/icons/icon-props"
import { CaptureNetIcon } from "@/components/icons/skull-king/capture-net-icon"

import { Anchor, Coins, Link2, Plus, Skull, Spade, Star, Waves } from "lucide-react"

const badgeStroke = 1.25

function lucidePassthrough(className?: string): { className?: string } {
  return className !== undefined ? { className } : {}
}

/** Small round-score event glyph — semantic tokens/color from badge container. */
export function EventBadgeIcon({ kind, className }: { kind: EventBadgeKind } & IconProps) {
  const p = lucidePassthrough(className)

  switch (kind) {
    case "coin":
      return (
        <Coins
          {...p}
          aria-hidden
          strokeWidth={badgeStroke}
        />
      )
    case "skull":
      return (
        <Skull
          {...p}
          aria-hidden
          strokeWidth={badgeStroke}
        />
      )
    case "trump":
      return (
        <Spade
          {...p}
          aria-hidden
          strokeWidth={badgeStroke}
        />
      )
    case "bonus":
      return (
        <Star
          {...p}
          aria-hidden
          strokeWidth={badgeStroke}
        />
      )
    case "kraken":
      return (
        <Waves
          {...p}
          aria-hidden
          strokeWidth={badgeStroke}
        />
      )
    case "pirate":
      return (
        <Anchor
          {...p}
          aria-hidden
          strokeWidth={badgeStroke}
        />
      )
    case "alliance":
      return (
        <Link2
          {...p}
          aria-hidden
          strokeWidth={badgeStroke}
        />
      )
    case "capture":
      return (
        <CaptureNetIcon {...p} />
      )
    case "fourteen":
      return (
        <Plus
          {...p}
          aria-hidden
          strokeWidth={badgeStroke}
        />
      )
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}
