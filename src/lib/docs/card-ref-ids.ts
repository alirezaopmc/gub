import { cardImagePath, createCard } from "@/lib/games/skull-king/engine/cards"
import type { Card, CardKind, MermaidId, PirateId } from "@/lib/games/skull-king/engine/types"

const PIRATE_ALIASES: Record<string, PirateId> = {
  rosie: "rosie",
  bendt: "bendt",
  rascal: "rascal",
  juanita: "juanita",
  harry: "harry",
}

const MERMAID_ALIASES: Record<string, MermaidId> = {
  alyra: "alyra",
  sirena: "sirena",
}

function parseCardRefId(id: string): CardKind {
  const normalized = id.toLowerCase().trim()

  switch (normalized) {
    case "kraken":
      return { kind: "kraken" }
    case "whale":
      return { kind: "whale" }
    case "loot":
      return { kind: "loot", index: 0 }
    case "escape":
      return { kind: "escape", index: 0 }
    case "tigress":
      return { kind: "tigress" }
    case "skull-king":
    case "skull_king":
    case "skullking":
      return { kind: "skull_king" }
    case "pirate":
      return { kind: "pirate", pirate: "rosie" }
    case "mermaid":
      return { kind: "mermaid", mermaid: "alyra" }
  }

  const pirateMatch = normalized.match(/^pirate[-_](.+)$/)
  if (pirateMatch) {
    const pirate = PIRATE_ALIASES[pirateMatch[1]]
    if (pirate) return { kind: "pirate", pirate }
  }

  const mermaidMatch = normalized.match(/^mermaid[-_](.+)$/)
  if (mermaidMatch) {
    const mermaid = MERMAID_ALIASES[mermaidMatch[1]]
    if (mermaid) return { kind: "mermaid", mermaid }
  }

  throw new Error(`Unknown card ref id: ${id}`)
}

export function resolveCardRefId(id: string): Card {
  return createCard(parseCardRefId(id))
}

export function resolveCardRefImagePath(id: string): string {
  return cardImagePath(resolveCardRefId(id))
}

const DEFAULT_LABELS: Record<string, string> = {
  kraken: "Kraken",
  whale: "White Whale",
  loot: "Loot",
  escape: "Escape",
  tigress: "Tigress",
  "skull-king": "Skull King",
  skull_king: "Skull King",
  skullking: "Skull King",
  pirate: "Pirate",
  mermaid: "Mermaid",
  "pirate-rosie": "Pirate Rosie",
  "pirate-bendt": "Pirate Bendt",
  "pirate-rascal": "Pirate Rascal",
  "pirate-juanita": "Pirate Juanita",
  "pirate-harry": "Pirate Harry",
  "mermaid-alyra": "Mermaid Alyra",
  "mermaid-sirena": "Mermaid Sirena",
}

export function defaultCardRefLabel(id: string): string {
  const normalized = id.toLowerCase().trim()
  return DEFAULT_LABELS[normalized] ?? id
}
