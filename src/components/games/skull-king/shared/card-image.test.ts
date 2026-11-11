import { describe, expect, it } from "vitest";
import { CARD_PALETTE } from "@/lib/games/skull-king/engine/card-palette";
import {
  CARD_BACK_IMAGE,
  cardImagePath,
  createCard,
} from "@/lib/games/skull-king/engine/cards";
import {
  cardImageLabel,
  cardImageSrc,
  cardImageTone,
  FACE_DOWN_LABEL,
} from "./card-image";

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

describe("card image helpers", () => {
  const green7 = createCard({ kind: "suited", suit: "green", rank: 7 });
  const rosie = createCard({ kind: "pirate", pirate: "rosie" });

  it("labels face-up cards with their card label", () => {
    expect(cardImageLabel(green7, false)).toBe("Parrot (green) 7");
    expect(cardImageLabel(rosie, undefined)).toBe("Pirate Rosie D. Laney");
  });

  it("labels face-down or missing cards as face-down", () => {
    expect(cardImageLabel(green7, true)).toBe(FACE_DOWN_LABEL);
    expect(cardImageLabel(undefined, false)).toBe(FACE_DOWN_LABEL);
  });

  it("uses the card image path, or the back image when face-down", () => {
    expect(cardImageSrc(green7, false)).toBe(cardImagePath(green7));
    expect(cardImageSrc(green7, true)).toBe(CARD_BACK_IMAGE);
    expect(cardImageSrc(undefined, undefined)).toBe(CARD_BACK_IMAGE);
  });

  it("tints by suit or special colour, and uses the back tone when face-down", () => {
    expect(cardImageTone(green7, false)).toBe(CARD_PALETTE.green);
    expect(cardImageTone(rosie, false)).toBe(CARD_PALETTE.pirate);
    expect(cardImageTone(green7, true)).toBe(CARD_PALETTE.back);
    expect(cardImageTone(undefined, false)).toBe(CARD_PALETTE.back);
  });

  it("keeps text on every tone at or above 4.5:1", () => {
    for (const [key, tone] of Object.entries(CARD_PALETTE)) {
      expect(contrast(tone.fg, tone.bg), key).toBeGreaterThanOrEqual(4.5);
    }
  });
});
