/** Colour tones for Skull King card art. Shared by the SVG generator and the text fallback tile. */

import type { CardKind, StandardSuit } from "./types";

export type CardToneKey =
  | StandardSuit
  | "escape"
  | "pirate"
  | "tigress"
  | "skull_king"
  | "mermaid"
  | "kraken"
  | "loot"
  | "whale"
  | "back";

export type CardTone = { bg: string; fg: string };

/** Every pair is at least 4.5:1 (WCAG AA for normal text). */
export const CARD_PALETTE: Record<CardToneKey, CardTone> = {
  green: { bg: "#2e7d32", fg: "#ffffff" },
  yellow: { bg: "#f2c230", fg: "#1a1a1a" },
  purple: { bg: "#6a3d9a", fg: "#ffffff" },
  black: { bg: "#1e1e24", fg: "#f5f5f5" },
  escape: { bg: "#dbe7ef", fg: "#14232e" },
  pirate: { bg: "#8b1e2d", fg: "#ffffff" },
  tigress: { bg: "#e07b13", fg: "#111111" },
  skull_king: { bg: "#f7f3e8", fg: "#1b1b1b" },
  mermaid: { bg: "#0e7c86", fg: "#ffffff" },
  kraken: { bg: "#4a2c17", fg: "#ffffff" },
  loot: { bg: "#a33a22", fg: "#ffffff" },
  whale: { bg: "#35607a", fg: "#ffffff" },
  back: { bg: "#1b2a4a", fg: "#e8eef8" },
};

export function cardToneKey(def: CardKind): CardToneKey {
  switch (def.kind) {
    case "suited":
      return def.suit;
    case "escape":
      return "escape";
    case "pirate":
      return "pirate";
    case "tigress":
      return "tigress";
    case "skull_king":
      return "skull_king";
    case "mermaid":
      return "mermaid";
    case "kraken":
      return "kraken";
    case "loot":
      return "loot";
    case "whale":
      return "whale";
  }
}
