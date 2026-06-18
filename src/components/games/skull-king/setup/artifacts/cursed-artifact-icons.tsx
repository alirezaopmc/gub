import type { IconProps } from "@/components/icons/icon-props"

/** Decorative icons — color from parent via `currentColor`. */
export function PirateAbilitiesIcon({ className }: IconProps) {
  return (
    <svg className={className} width={24} height={24} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4c-2.5 0-4.5 2-4.5 4.5V12c0 1 .5 2 1.5 2.5V19c0 .6.4 1 1 1h4c.6 0 1-.4 1-1v-4.5c1-.5 1.5-1.5 1.5-2.5V8.5C16.5 6 14.5 4 12 4Z"
      />
      <path fill="currentColor" d="M9 11h1.5v1.5H9V11Zm4.5 0H15v1.5h-1.5V11Z" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M9.5 15.5c1 1 4 1 5 0"
      />
    </svg>
  )
}

export function HeroCaptureIcon({ className }: IconProps) {
  return (
    <svg className={className} width={24} height={24} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 17V7l3 2.5L10 6l3 3 3-2v10"
      />
      <circle cx={6.5} cy={9.5} r={0.9} fill="currentColor" />
      <circle cx={12} cy={7} r={0.9} fill="currentColor" />
      <circle cx={17.5} cy={9} r={0.9} fill="currentColor" />
      <rect x={15} y={14} width={5} height={3.5} rx={0.5} fill="currentColor" />
    </svg>
  )
}

export function WhaleIcon({ className }: IconProps) {
  return (
    <svg className={className} width={24} height={24} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        d="M3 15c2.5-2 6-3 10-3s7.5 1 10 3M3 17c2.5-1.5 6-2.5 10-2.5s7.5 1 10 2.5M3 19c2-1 5.5-1.5 10-1.5s8 .5 10 1.5M3 13c2-1.5 5-2 10-2s8 .5 10 2"
      />
    </svg>
  )
}

export function KrakenIcon({ className }: IconProps) {
  return (
    <svg className={className} width={24} height={24} viewBox="0 0 24 24" aria-hidden>
      <ellipse cx={12} cy={8} rx={4} ry={3} fill="currentColor" />
      <path
        fill="currentColor"
        d="M7 10.5Q5 14 4.5 18.5h2Q7 14 8.5 11zm4 .5Q10 15 9.8 18.5h2.4Q12.2 15 13 11zm4-.5Q17 14 19.5 18.5h2Q19 14 17 10.5zm-6 1.5q-.8 3.5-1 5.5h2.2q.2-2 1-5.5zm4 0q.8 3.5 1 5.5h2.2q-.2-2-1-5.5z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        d="M4 13H2M22 13h-2M5 16H3M21 16h-2"
      />
    </svg>
  )
}

export function CoinExpansionIcon({ className }: IconProps) {
  return (
    <svg className={className} width={24} height={24} viewBox="0 0 24 24" aria-hidden>
      <circle cx={12} cy={12} r={9} fill="none" stroke="currentColor" strokeWidth={1.75} />
      <path
        fill="currentColor"
        d="M12 8.25c-1.65 0-2.75.75-2.75 1.75S10.35 12 12 12s2.75.75 2.75 1.75S13.65 15.5 12 15.5c-.95 0-1.75-.25-2.3-.65l-.95.95c.75.65 1.85 1.05 3.05 1.1V19h1.25v-1.15c1.7-.2 2.8-1.25 2.8-2.6 0-1.75-1.65-2.55-4-2.8-1.45-.15-2-.45-2-.9 0-.5.75-.9 1.65-.9.8 0 1.45.25 1.85.65l.9-.9c-.55-.55-1.45-.9-2.55-.95V8.25h-.15Z"
      />
    </svg>
  )
}

export function FourteenBonusIcon({ className }: IconProps) {
  return (
    <svg className={className} width={24} height={24} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 4 9.8 9.2 4.2 9.9l4.3 4.1-1.2 5.8 5.5-3.1 5.5 3.1-1.2-5.8 4.3-4.1-5.6-.7L12 4Zm0 2.4 1.2 2.8.2.45h3.1l-2.5 2.4-.25.35.08.35.75 2.9-2.4-1.45h-.4l-2.4 1.45.75-2.9.08-.35-.25-.35-2.5-2.4h3.1l.2-.45 1.2-2.8Z"
      />
    </svg>
  )
}
