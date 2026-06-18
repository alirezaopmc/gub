"use client"

import * as React from "react"
import Link from "next/link"

import { VoyageNavigator } from "@/components/games/skull-king/round-score/header/voyage-navigator"
import styles from "@/components/games/skull-king/round-score/styles/round-score.module.css"
import { loadGameConfig } from "@/lib/games/skull-king/game-config-storage"
import { useRoundScoreStore } from "@/lib/games/skull-king/round-score/round-score-store"

type BootState = "loading" | "error" | "ready"

export type RoundPhaseLayoutProps = {
  children: React.ReactNode
  footer: React.ReactNode
}

export function RoundPhaseLayout({ children, footer }: RoundPhaseLayoutProps) {
  const [boot, setBoot] = React.useState<BootState>("loading")
  const initFromConfig = useRoundScoreStore((s) => s.initFromConfig)

  React.useEffect(() => {
    const config = loadGameConfig()
    if (!config) {
      setBoot("error")
      return
    }
    initFromConfig(config)
    setBoot("ready")
  }, [initFromConfig])

  if (boot === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <p className="text-muted-foreground">Loading voyage…</p>
      </div>
    )
  }

  if (boot === "error") {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4 px-6 py-12">
        <p className="text-destructive">
          No saved game found. Start from setup to create a crew and voyage.
        </p>
        <Link href="/games/skull-king/setup" className="text-primary underline underline-offset-4">
          Back to setup
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <VoyageNavigator />
      {children}
      {footer}
    </div>
  )
}
