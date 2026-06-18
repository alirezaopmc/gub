/**
 * Round schema: comma-separated hand sizes per deal (positive integers).
 * Parsing skips empties and invalid tokens.
 */

/** Full voyage default: hands 1 … 10 cards. */
export const ROUNDS_SCHEMA_PRESETS = {
  default: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  odds: [1, 3, 5, 7, 9],
  evens: [2, 4, 6, 8, 10],
  rich: [6, 7, 8, 9, 10],
} as const

export type RoundsSchemaPresetId = keyof typeof ROUNDS_SCHEMA_PRESETS

export const DEFAULT_ROUNDS_SCHEMA: number[] = [...ROUNDS_SCHEMA_PRESETS.default]

export function roundsSchemasEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((n, i) => n === b[i])
}

export function parseRoundsSchemaInput(raw: string): number[] {
  const parts = raw.split(/[,，]\s*|\s+/)
  const out: number[] = []
  for (const part of parts) {
    const t = part.trim()
    if (t === "") continue
    const n = Number.parseInt(t, 10)
    if (Number.isFinite(n) && n > 0) out.push(n)
  }
  return out
}

export function formatRoundsSchema(rounds: readonly number[]): string {
  return rounds.join(", ")
}
