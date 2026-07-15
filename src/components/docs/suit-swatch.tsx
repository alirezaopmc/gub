import type { StandardSuit } from "@/lib/games/skull-king/engine/types"

import styles from "@/components/docs/styles/suit-swatch.module.css"

const SUIT_LABELS: Record<StandardSuit, string> = {
  green: "Green",
  yellow: "Yellow",
  purple: "Purple",
  black: "Black (Jolly Roger)",
}

export type SuitSwatchProps = {
  suit: StandardSuit
  showLabel?: boolean
}

export function SuitSwatch({ suit, showLabel = true }: SuitSwatchProps) {
  const label = SUIT_LABELS[suit]

  return (
    <span className={`${styles.swatch} ${styles[suit]}`} aria-label={label}>
      <span className={styles.dot} aria-hidden />
      {showLabel ? <span>{label}</span> : null}
    </span>
  )
}
