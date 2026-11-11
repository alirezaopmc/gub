import type {
  Card,
  CardKind,
  MermaidId,
  PirateId,
  StandardSuit,
} from "./types";

const SUIT_PREFIX: Record<StandardSuit, string> = {
  green: "parrot_green",
  yellow: "treasure_chest_yellow",
  purple: "pirate_map_purple",
  black: "jolly_roger_black",
};

const PIRATE_FILES: Record<PirateId, string> = {
  rosie: "pirate_rosie_d_laney",
  bendt: "pirate_bendt_the_bandit",
  rascal: "pirate_rascal_of_roatan",
  juanita: "pirate_juanita_jade",
  harry: "pirate_harry_the_giant",
};

const MERMAID_FILES: Record<MermaidId, string> = {
  alyra: "mermaid_alyra",
  sirena: "mermaid_sirena",
};

export function cardId(def: CardKind): string {
  switch (def.kind) {
    case "suited":
      return `${def.suit}:${def.rank}`;
    case "escape":
      return `escape:${def.index}`;
    case "pirate":
      return `pirate:${def.pirate}`;
    case "tigress":
      return "tigress";
    case "skull_king":
      return "skull_king";
    case "mermaid":
      return `mermaid:${def.mermaid}`;
    case "kraken":
      return "kraken";
    case "loot":
      return `loot:${def.index}`;
    case "whale":
      return "whale";
  }
}

export function createCard(def: CardKind): Card {
  return { id: cardId(def), def };
}

const SUIT_WORD: Record<StandardSuit, string> = {
  green: "Parrot",
  yellow: "Treasure chest",
  purple: "Pirate map",
  black: "Jolly Roger",
};

const PIRATE_NAMES: Record<PirateId, string> = {
  rosie: "Pirate Rosie D. Laney",
  bendt: "Pirate Bendt the Bandit",
  rascal: "Pirate Rascal of Roatan",
  juanita: "Pirate Juanita Jade",
  harry: "Pirate Harry the Giant",
};

const MERMAID_NAMES: Record<MermaidId, string> = {
  alyra: "Mermaid Alyra",
  sirena: "Mermaid Sirena",
};

/** Plain-English label for a card, used for alt text and tooltips. */
export function cardLabel(card: Card): string {
  const d = card.def;
  switch (d.kind) {
    case "suited":
      return `${SUIT_WORD[d.suit]} (${d.suit}) ${d.rank}`;
    case "escape":
      return "Escape";
    case "pirate":
      return PIRATE_NAMES[d.pirate];
    case "tigress":
      return "Tigress";
    case "skull_king":
      return "Skull King";
    case "mermaid":
      return MERMAID_NAMES[d.mermaid];
    case "kraken":
      return "Kraken";
    case "loot":
      return "Loot";
    case "whale":
      return "White Whale";
  }
}

export function cardImagePath(card: Card): string {
  const d = card.def;
  switch (d.kind) {
    case "suited": {
      const rank = String(d.rank).padStart(2, "0");
      return `/games/skull-king/cards/${SUIT_PREFIX[d.suit]}_${rank}.svg`;
    }
    case "escape":
      return "/games/skull-king/cards/escape.svg";
    case "pirate":
      return `/games/skull-king/cards/${PIRATE_FILES[d.pirate]}.svg`;
    case "tigress":
      return "/games/skull-king/cards/tigress.svg";
    case "skull_king":
      return "/games/skull-king/cards/skull_king.svg";
    case "mermaid":
      return `/games/skull-king/cards/${MERMAID_FILES[d.mermaid]}.svg`;
    case "kraken":
      return "/games/skull-king/cards/kraken.svg";
    case "loot":
      return "/games/skull-king/cards/loot.svg";
    case "whale":
      return "/games/skull-king/cards/whale.svg";
  }
}

export const CARD_BACK_IMAGE =
  "/games/skull-king/cards/skull_king_card_back.svg";

export function isSuited(card: Card): card is Card & {
  def: { kind: "suited"; suit: StandardSuit; rank: number };
} {
  return card.def.kind === "suited";
}

export function isSpecial(card: Card): boolean {
  return card.def.kind !== "suited";
}

export function isEscapeLike(
  card: Card,
  tigressMode?: "pirate" | "escape",
): boolean {
  if (card.def.kind === "escape") return true;
  if (card.def.kind === "loot") return true;
  if (card.def.kind === "tigress" && tigressMode === "escape") return true;
  return false;
}

export function isCharacterLead(
  card: Card,
  tigressMode?: "pirate" | "escape",
): boolean {
  if (
    card.def.kind === "mermaid" ||
    card.def.kind === "pirate" ||
    card.def.kind === "skull_king"
  )
    return true;
  if (card.def.kind === "kraken" || card.def.kind === "whale") return true;
  if (card.def.kind === "tigress" && tigressMode === "pirate") return true;
  return false;
}

export function pirateFromCard(card: Card): PirateId | null {
  return card.def.kind === "pirate" ? card.def.pirate : null;
}
