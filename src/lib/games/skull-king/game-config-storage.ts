import { Artifacts, ARTIFACTS_LIST, createInitialArtifactOptions } from "@/lib/games/skull-king/artifacts"
import type { SkullKingGameConfig } from "@/lib/games/skull-king/skull-king-game-config"
import { duplicatePlayerIndices, nameEqualityKey } from "@/lib/games/skull-king/crew-name-validation"
import {
  MAX_CREW_NAME_LENGTH,
  MAX_CREW_PLAYERS,
  MIN_CREW_PLAYERS,
} from "@/lib/games/skull-king/setup/crew-manifest-types"
import { isSetupReadyForStart } from "@/lib/games/skull-king/setup-ready"

const STORAGE_KEY = "skull-king:game-config"
const LAST_ARTIFACT_OPTIONS_KEY = "skull-king:last-artifact-options"

const MAX_ROUNDS = 40
const MAX_TRICKS_PER_ROUND = 20

type StoredGameConfig = {
  v: 1
  players: unknown
  roundsSchema: unknown
  options: unknown
}

type StoredLastArtifactOptions = {
  v: 1
  options: unknown
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x)
}

/** Merge wire/options onto the expert baseline (fills missing keys). */
export function normalizeArtifactOptions(raw: unknown): Record<Artifacts, boolean> {
  const base = createInitialArtifactOptions()
  if (!isRecord(raw)) return base
  for (const key of ARTIFACTS_LIST) {
    const v = raw[key as string]
    if (typeof v === "boolean") base[key] = v
  }
  return base
}

function clampConfigFromWire(input: StoredGameConfig): SkullKingGameConfig | null {
  if (!Array.isArray(input.players) || !Array.isArray(input.roundsSchema)) return null
  const players = input.players
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.slice(0, MAX_CREW_NAME_LENGTH))
  if (players.length > MAX_CREW_PLAYERS) return null
  const roundsSchema = input.roundsSchema
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    .map((n) => Math.max(1, Math.min(MAX_TRICKS_PER_ROUND, Math.floor(n))))
    .slice(0, MAX_ROUNDS)
  const namedCount = players.filter((p) => nameEqualityKey(p) !== "").length
  if (namedCount < MIN_CREW_PLAYERS || namedCount > MAX_CREW_PLAYERS) return null
  if (roundsSchema.length === 0) return null
  if (duplicatePlayerIndices(players).size > 0) return null
  if (!isSetupReadyForStart(players, roundsSchema)) return null
  return {
    players,
    roundsSchema,
    options: normalizeArtifactOptions(input.options),
  }
}

function parseStoredJson(json: string): SkullKingGameConfig | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(json) as unknown
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  if (parsed.v !== 1) return null
  return clampConfigFromWire(parsed as StoredGameConfig)
}

export function saveGameConfig(config: SkullKingGameConfig): void {
  if (typeof window === "undefined") return
  const envelope: StoredGameConfig = {
    v: 1,
    players: config.players,
    roundsSchema: config.roundsSchema,
    options: config.options,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
}

export function loadGameConfig(): SkullKingGameConfig | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === null || raw === "") return null
  return parseStoredJson(raw)
}

export function clearGameConfig(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}

/**
 * Defaults for a fresh setup UI: last artifact toggles from a previous “Start”, else expert preset.
 * Safe on the server (returns expert baseline).
 */
export function getDefaultArtifactOptionsForNewGame(): Record<Artifacts, boolean> {
  if (typeof window === "undefined") return createInitialArtifactOptions()
  const raw = window.localStorage.getItem(LAST_ARTIFACT_OPTIONS_KEY)
  if (raw === null || raw === "") return createInitialArtifactOptions()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return createInitialArtifactOptions()
  }
  if (!isRecord(parsed)) return createInitialArtifactOptions()
  if (parsed.v !== 1) return createInitialArtifactOptions()
  return normalizeArtifactOptions((parsed as StoredLastArtifactOptions).options)
}

/** Persist artifact toggles to reuse as defaults on the next new setup (call when starting a voyage from setup). */
export function saveLastArtifactOptions(options: Record<Artifacts, boolean>): void {
  if (typeof window === "undefined") return
  const envelope: StoredLastArtifactOptions = { v: 1, options }
  window.localStorage.setItem(LAST_ARTIFACT_OPTIONS_KEY, JSON.stringify(envelope))
}
