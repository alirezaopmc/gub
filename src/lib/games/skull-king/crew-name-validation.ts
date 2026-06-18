/**
 * Pure crew-name rules for Skull King setup. Safe to call from UI or (later) server actions.
 */

import { MAX_CREW_NAME_LENGTH } from "@/lib/games/skull-king/setup/crew-manifest-types"

export type CrewNameRow = { id: string; name: string }

export function clampCrewPlayerName(raw: string): string {
  return raw.slice(0, MAX_CREW_NAME_LENGTH)
}

/** Normalize for equality: trim, collapse spaces, fold case (player names are human labels). */
export function nameEqualityKey(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase()
}

/**
 * Returns the set of row ids whose non-empty name collides with another row.
 * Empty names are ignored so two blank slots are not treated as duplicates.
 */
export function duplicateNameRowIds(members: readonly CrewNameRow[]): ReadonlySet<string> {
  const buckets = new Map<string, string[]>()
  for (const row of members) {
    const key = nameEqualityKey(row.name)
    if (key === "") continue
    const list = buckets.get(key)
    if (list) list.push(row.id)
    else buckets.set(key, [row.id])
  }
  const out = new Set<string>()
  for (const ids of buckets.values()) {
    if (ids.length > 1) for (const id of ids) out.add(id)
  }
  return out
}

/**
 * Indices in `players` whose trimmed non-empty name collides with another slot.
 */
export function duplicatePlayerIndices(players: readonly string[]): ReadonlySet<number> {
  const buckets = new Map<string, number[]>()
  players.forEach((name, index) => {
    const key = nameEqualityKey(name)
    if (key === "") return
    const list = buckets.get(key)
    if (list) list.push(index)
    else buckets.set(key, [index])
  })
  const out = new Set<number>()
  for (const indices of buckets.values()) {
    if (indices.length > 1) for (const i of indices) out.add(i)
  }
  return out
}

/**
 * Indices grouped by duplicate normalized name (non-empty keys only).
 * Each inner array is sorted ascending; groups ordered by smallest index in group.
 */
export function duplicateIndexGroups(players: readonly string[]): number[][] {
  const buckets = new Map<string, number[]>()
  players.forEach((name, index) => {
    const key = nameEqualityKey(name)
    if (key === "") return
    const list = buckets.get(key)
    if (list) list.push(index)
    else buckets.set(key, [index])
  })
  const groups: number[][] = []
  for (const indices of buckets.values()) {
    if (indices.length < 2) continue
    groups.push([...indices].sort((a, b) => a - b))
  }
  groups.sort((a, b) => a[0] - b[0])
  return groups
}

function formatSlots(indices: readonly number[]): string {
  const slots = indices.map((i) => `#${i + 1}`)
  if (slots.length === 2) return `${slots[0]} and ${slots[1]}`
  if (slots.length === 1) return slots[0]
  return `${slots.slice(0, -1).join(", ")}, and ${slots[slots.length - 1]}`
}

/** Short UI copy listing duplicate slots (1-based #n labels). */
export function formatDuplicateCrewMessage(groups: readonly (readonly number[])[]): string {
  if (groups.length === 0) return ""
  const parts = groups.map((g) => formatSlots(g))
  if (parts.length === 1) {
    return `Duplicate names: slots ${parts[0]}.`
  }
  return `Duplicate names: ${parts.map((p) => `slots ${p}`).join("; ")}.`
}
