import { describe, expect, it } from "vitest";
import { cardLabel, createCard } from "./cards";
import type { CardKind } from "./types";

describe("cardLabel", () => {
  const cases: [string, CardKind][] = [
    ["Parrot (green) 7", { kind: "suited", suit: "green", rank: 7 }],
    [
      "Treasure chest (yellow) 14",
      { kind: "suited", suit: "yellow", rank: 14 },
    ],
    ["Pirate map (purple) 1", { kind: "suited", suit: "purple", rank: 1 }],
    ["Jolly Roger (black) 7", { kind: "suited", suit: "black", rank: 7 }],
    ["Escape", { kind: "escape", index: 0 }],
    ["Pirate Rosie D. Laney", { kind: "pirate", pirate: "rosie" }],
    ["Pirate Bendt the Bandit", { kind: "pirate", pirate: "bendt" }],
    ["Pirate Rascal of Roatan", { kind: "pirate", pirate: "rascal" }],
    ["Pirate Juanita Jade", { kind: "pirate", pirate: "juanita" }],
    ["Pirate Harry the Giant", { kind: "pirate", pirate: "harry" }],
    ["Tigress", { kind: "tigress" }],
    ["Skull King", { kind: "skull_king" }],
    ["Mermaid Alyra", { kind: "mermaid", mermaid: "alyra" }],
    ["Mermaid Sirena", { kind: "mermaid", mermaid: "sirena" }],
    ["Kraken", { kind: "kraken" }],
    ["Loot", { kind: "loot", index: 0 }],
    ["White Whale", { kind: "whale" }],
  ];

  it.each(cases)("labels %s", (label, def) => {
    expect(cardLabel(createCard(def))).toBe(label);
  });
});
