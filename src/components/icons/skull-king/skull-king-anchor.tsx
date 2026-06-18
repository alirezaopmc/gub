import type { IconProps } from "@/components/icons/icon-props"

export function SkullKingAnchorIcon({ className }: IconProps) {
  return (
    <svg className={className} width={22} height={22} viewBox="0 0 24 24" aria-hidden>
      <circle cx={12} cy={6.5} r={2.25} fill="currentColor" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8.75V20M8.5 14h-3m10 0h-3M8 14c0 2 2.8 3.75 5.5 3.75S16 16 16 14"
      />
    </svg>
  )
}
