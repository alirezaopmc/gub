import Image from "next/image"

import styles from "@/components/docs/styles/card-ref.module.css"
import { defaultCardRefLabel, resolveCardRefImagePath } from "@/lib/docs/card-ref-ids"

const DOC_CARD_WIDTH = 80
const DOC_CARD_HEIGHT = 112

export type CardRefProps = {
  id: string
  label?: string
}

export function CardRef({ id, label }: CardRefProps) {
  const src = resolveCardRefImagePath(id)
  const displayLabel = label ?? defaultCardRefLabel(id)

  return (
    <span className={styles.cardRef}>
      <span className={styles.frame}>
        <Image
          src={src}
          alt=""
          width={DOC_CARD_WIDTH}
          height={DOC_CARD_HEIGHT}
          className={styles.image}
          unoptimized
          aria-hidden
        />
      </span>
      <span className={styles.label}>{displayLabel}</span>
    </span>
  )
}
