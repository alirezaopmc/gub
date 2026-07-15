"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

import {
  Artifacts,
  createInitialArtifactOptions,
  type ArtifactPresetId,
} from "@/lib/games/skull-king/artifacts"
import {
  getDefaultArtifactOptionsForNewGame,
  saveLastArtifactOptions,
} from "@/lib/games/skull-king/game-config-storage"

type DocsArtifactContextValue = {
  options: Record<Artifacts, boolean>
  setArtifactOptions: (options: Record<Artifacts, boolean>) => void
  toggleArtifact: (artifact: Artifacts) => void
}

const DocsArtifactContext = createContext<DocsArtifactContextValue | null>(null)

export function DocsArtifactProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState(() =>
    typeof window === "undefined"
      ? createInitialArtifactOptions()
      : getDefaultArtifactOptionsForNewGame(),
  )

  const setArtifactOptions = useCallback((next: Record<Artifacts, boolean>) => {
    setOptions(next)
    saveLastArtifactOptions(next)
  }, [])

  const toggleArtifact = useCallback((artifact: Artifacts) => {
    setOptions((prev) => {
      const next = { ...prev, [artifact]: !prev[artifact] }
      saveLastArtifactOptions(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ options, setArtifactOptions, toggleArtifact }),
    [options, setArtifactOptions, toggleArtifact],
  )

  return <DocsArtifactContext.Provider value={value}>{children}</DocsArtifactContext.Provider>
}

export function useDocsArtifacts(): DocsArtifactContextValue {
  const ctx = useContext(DocsArtifactContext)
  if (!ctx) {
    throw new Error("useDocsArtifacts must be used within DocsArtifactProvider")
  }
  return ctx
}

export type { ArtifactPresetId }
