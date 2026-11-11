import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  allCardDefs,
  CARD_ART_DIR,
  cardArtEntries,
} from "../../../../../scripts/generate-card-art";
import { CARD_BACK_IMAGE, cardImagePath, createCard } from "./cards";

describe("generated card art", () => {
  const scriptPaths = cardArtEntries().map((e) => e.publicPath);

  it("covers every path cardImagePath can return, plus the card back", () => {
    const enginePaths = new Set(
      allCardDefs().map((def) => cardImagePath(createCard(def))),
    );
    enginePaths.add(CARD_BACK_IMAGE);
    expect(new Set(scriptPaths)).toEqual(enginePaths);
    expect(scriptPaths).toHaveLength(enginePaths.size);
  });

  it("has a generated SVG file on disk for every card", () => {
    for (const entry of cardArtEntries()) {
      const file = path.join(CARD_ART_DIR, entry.fileName);
      expect(existsSync(file), entry.fileName).toBe(true);
      expect(entry.publicPath.endsWith(`/${entry.fileName}`)).toBe(true);
    }
  });
});
