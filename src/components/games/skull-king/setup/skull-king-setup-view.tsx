"use client"

import * as React from "react"

import { SkullKingSetupWizard } from "@/components/games/skull-king/setup/skull-king-setup-wizard"
import { loadGameConfig } from "@/lib/games/skull-king/game-config-storage"
import { isDefaultSkullKingSetup, useSkullKingStore } from "@/lib/games/skull-king/skull-king-store"

/** Ordered setup flow for the Skull King host page. */
export function SkullKingSetupView() {
  const hydrateFromGameConfig = useSkullKingStore((s) => s.hydrateFromGameConfig)

  React.useLayoutEffect(() => {
    const saved = loadGameConfig()
    if (!saved) return
    if (!isDefaultSkullKingSetup(useSkullKingStore.getState())) return
    hydrateFromGameConfig(saved)
  }, [hydrateFromGameConfig])

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <SkullKingSetupWizard />
    </div>
  )
}
