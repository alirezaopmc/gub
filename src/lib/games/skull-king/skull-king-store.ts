import { arrayMove } from "@dnd-kit/sortable"
import { create } from "zustand"

import { ARTIFACTS_LIST, Artifacts, createInitialArtifactOptions } from "@/lib/games/skull-king/artifacts"
import { getDefaultArtifactOptionsForNewGame } from "@/lib/games/skull-king/game-config-storage"
import { createCrewRow, type CrewRow, crewRowNames } from "@/lib/games/skull-king/crew-row"
import { clampCrewPlayerName } from "@/lib/games/skull-king/crew-name-validation"
import { DEFAULT_ROUNDS_SCHEMA, roundsSchemasEqual } from "@/lib/games/skull-king/rounds-schema"
import { MAX_CREW_PLAYERS, MIN_CREW_PLAYERS } from "@/lib/games/skull-king/setup/crew-manifest-types"
import type { SkullKingGameConfig } from "@/lib/games/skull-king/skull-king-game-config"

function artifactOptionsEqual(
  a: Record<Artifacts, boolean>,
  b: Record<Artifacts, boolean>
): boolean {
  return ARTIFACTS_LIST.every((k) => a[k] === b[k])
}

function createInitialSetupSlice(): Pick<SkullKingStore, "players" | "roundsSchema" | "options"> {
  return {
    players: [createCrewRow(""), createCrewRow("")],
    roundsSchema: [...DEFAULT_ROUNDS_SCHEMA],
    options: getDefaultArtifactOptionsForNewGame(),
  }
}

export type SkullKingStore = {
  players: CrewRow[]
  roundsSchema: number[]
  options: Record<Artifacts, boolean>
  /** Reset crew, voyage chart, and artifacts to defaults (e.g. after wiping local game). */
  resetToInitialSetup: () => void
  /** Replace setup state from a saved game (e.g. after loading from `localStorage`). */
  hydrateFromGameConfig: (config: SkullKingGameConfig) => void
  setPlayerName: (index: number, name: string) => void
  /** Sets how many name rows exist (2–8). New slots are blank; shrinking drops trailing names. */
  setCrewCount: (count: number) => void
  removePlayer: (index: number) => void
  /** Reorder crew by row index (from drag-and-drop). */
  reorderPlayers: (fromIndex: number, toIndex: number) => void
  setRoundsSchema: (rounds: number[]) => void
  toggleArtifact: (id: Artifacts) => void
  setArtifactOptions: (options: Record<Artifacts, boolean>) => void
  getGameConfig: () => SkullKingGameConfig
}

/** True when the store still matches the initial “empty setup” (used to avoid clobbering in-progress edits). */
export function isDefaultSkullKingSetup(
  s: Pick<SkullKingStore, "players" | "roundsSchema" | "options">
): boolean {
  const initialOptions = getDefaultArtifactOptionsForNewGame()
  return (
    s.players.length === 2 &&
    s.players[0].name === "" &&
    s.players[1].name === "" &&
    roundsSchemasEqual(s.roundsSchema, DEFAULT_ROUNDS_SCHEMA) &&
    artifactOptionsEqual(s.options, initialOptions)
  )
}

export const useSkullKingStore = create<SkullKingStore>((set, get) => ({
  ...createInitialSetupSlice(),

  resetToInitialSetup: () => set(createInitialSetupSlice()),

  hydrateFromGameConfig: (config) => {
    const merged = { ...createInitialArtifactOptions(), ...config.options }
    set({
      players: config.players.map((name) => createCrewRow(clampCrewPlayerName(name))),
      roundsSchema: [...config.roundsSchema],
      options: merged,
    })
  },

  setPlayerName: (index, name) =>
    set((s) => ({
      players: s.players.map((row, i) =>
        i === index ? { ...row, name: clampCrewPlayerName(name) } : row
      ),
    })),

  setCrewCount: (count) =>
    set((s) => {
      const n = Math.min(
        MAX_CREW_PLAYERS,
        Math.max(MIN_CREW_PLAYERS, Math.floor(Number.isFinite(count) ? count : MIN_CREW_PLAYERS)),
      )
      if (n === s.players.length) return s
      if (n > s.players.length) {
        const extra = Array.from({ length: n - s.players.length }, () => createCrewRow(""))
        return { players: [...s.players, ...extra] }
      }
      return { players: s.players.slice(0, n) }
    }),

  removePlayer: (index) =>
    set((s) => {
      if (s.players.length <= MIN_CREW_PLAYERS) return s
      return { players: s.players.filter((_, i) => i !== index) }
    }),

  reorderPlayers: (fromIndex, toIndex) =>
    set((s) => {
      if (fromIndex === toIndex) return s
      if (fromIndex < 0 || toIndex < 0) return s
      if (fromIndex >= s.players.length || toIndex >= s.players.length) return s
      return { players: arrayMove(s.players, fromIndex, toIndex) }
    }),

  setRoundsSchema: (rounds) => set({ roundsSchema: rounds }),

  toggleArtifact: (id) =>
    set((s) => ({
      options: { ...s.options, [id]: !s.options[id] },
    })),

  setArtifactOptions: (options) => set({ options: { ...options } }),

  getGameConfig: () => {
    const { players, roundsSchema, options } = get()
    return {
      players: crewRowNames(players).map(clampCrewPlayerName),
      roundsSchema: [...roundsSchema],
      options: { ...options },
    }
  },
}))
