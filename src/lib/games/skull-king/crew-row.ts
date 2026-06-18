/** One crew line in setup: stable `id` for list keys and drag-and-drop; `name` is the editable label. */
export type CrewRow = {
  id: string
  name: string
}

export function newCrewRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `crew-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function createCrewRow(name = ""): CrewRow {
  return { id: newCrewRowId(), name }
}

export function crewRowNames(rows: readonly CrewRow[]): string[] {
  return rows.map((r) => r.name)
}
