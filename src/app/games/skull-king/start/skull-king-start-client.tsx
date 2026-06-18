"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { loadGameConfig } from "@/lib/games/skull-king/game-config-storage"
import { useSkullKingStore } from "@/lib/games/skull-king/skull-king-store"

function syncSetupStoreFromStorage() {
  const saved = loadGameConfig()
  if (saved) useSkullKingStore.getState().hydrateFromGameConfig(saved)
}

/** Legacy `/start` route: redirects into setup wizard step 4 (review & confirm). */
export function SkullKingStartClient() {
  const router = useRouter()
  const [status, setStatus] = React.useState<"loading" | "missing">("loading")

  React.useEffect(() => {
    const config = loadGameConfig()
    if (!config) {
      setStatus("missing")
      return
    }
    syncSetupStoreFromStorage()
    router.replace("/games/skull-king/setup?step=4")
  }, [router])

  if (status === "loading") {
    return <p className="text-muted-foreground">Opening setup…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-destructive">
        No saved game found. Start from setup to create a crew and voyage.
      </p>
      <Link
        href="/games/skull-king/setup"
        onClick={syncSetupStoreFromStorage}
        className="self-center text-primary underline underline-offset-4"
      >
        Back to setup
      </Link>
    </div>
  )
}
