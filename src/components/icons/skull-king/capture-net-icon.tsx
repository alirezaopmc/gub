import type { IconProps } from "@/components/icons/icon-props"

/** Character-capture badge — distinct from generic link / anchor metaphors. */
export function CaptureNetIcon({ className }: IconProps) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 5c2.2 0 2.2 2.5 4.2 2.5S11.5 5 13.5 5M3 8.5c2.2 0 2.2 2.5 4.2 2.5s4.3-2.5 5.3-2.5M3 12c1.3 0 2-1.2 3-2.1 1.5-1.2 1.4-1.2 2.4 0C9.4 10.8 10 12 12 12"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
