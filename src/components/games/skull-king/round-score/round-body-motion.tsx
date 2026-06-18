"use client"

import * as React from "react"

import styles from "@/components/games/skull-king/round-score/styles/round-score.module.css"
import { cn } from "@/lib/utils"

export type RoundScoreBodyMotionProps = {
  roundIndex: number
  children: React.ReactNode
}

/** Flex shell + keyed inner so round changes can run a short directional slide without shifting chrome. */
export function RoundScoreBodyMotion({ roundIndex, children }: RoundScoreBodyMotionProps) {
  const prevCommittedRoundRef = React.useRef(roundIndex)
  const [slideDir, setSlideDir] = React.useState<"next" | "prev" | null>(null)

  React.useLayoutEffect(() => {
    if (prevCommittedRoundRef.current === roundIndex) return
    setSlideDir(roundIndex > prevCommittedRoundRef.current ? "next" : "prev")
    prevCommittedRoundRef.current = roundIndex
  }, [roundIndex])

  const motionClass =
    slideDir === "next"
      ? styles.roundBodyEnterNext
      : slideDir === "prev"
        ? styles.roundBodyEnterPrev
        : styles.roundBodyEnterIdle

  return (
    <div className={styles.roundBodyMotionOuter}>
      <div key={roundIndex} className={cn(styles.roundBodyMotionInner, motionClass)}>
        {children}
      </div>
    </div>
  )
}
