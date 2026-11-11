"use client";

import * as React from "react";
import {
  CARD_PALETTE,
  type CardTone,
  cardToneKey,
} from "@/lib/games/skull-king/engine/card-palette";
import {
  CARD_BACK_IMAGE,
  cardImagePath,
  cardLabel,
} from "@/lib/games/skull-king/engine/cards";
import type { Card } from "@/lib/games/skull-king/engine/types";

export const FACE_DOWN_LABEL = "Face-down card";

/** Accessible label for a card image. Face-down or missing cards get the face-down label. */
export function cardImageLabel(
  card: Card | undefined,
  faceDown: boolean | undefined,
): string {
  if (faceDown || !card) return FACE_DOWN_LABEL;
  return cardLabel(card);
}

/** Image source for a card. Face-down or missing cards show the card back. */
export function cardImageSrc(
  card: Card | undefined,
  faceDown: boolean | undefined,
): string {
  if (faceDown || !card) return CARD_BACK_IMAGE;
  return cardImagePath(card);
}

/** Colour tone for the text fallback tile. Face-down or missing cards use the back tone. */
export function cardImageTone(
  card: Card | undefined,
  faceDown: boolean | undefined,
): CardTone {
  if (faceDown || !card) return CARD_PALETTE.back;
  return CARD_PALETTE[cardToneKey(card.def)];
}

export type CardImageProps = {
  card?: Card;
  faceDown?: boolean;
  /** Decorative images (label already shown as text) use an empty alt. */
  decorative?: boolean;
  className?: string;
  width: number;
  height: number;
};

export function CardImage({
  card,
  faceDown,
  decorative,
  className,
  width,
  height,
}: CardImageProps) {
  const src = cardImageSrc(card, faceDown);
  const label = cardImageLabel(card, faceDown);
  // Storing the failing src means the flag resets automatically when src changes.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const failed = failedSrc === src;

  if (failed) {
    const tone = cardImageTone(card, faceDown);
    return (
      <div
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : label}
        aria-hidden={decorative ? true : undefined}
        className={className}
        style={{
          width,
          aspectRatio: `${width} / ${height}`,
          background: tone.bg,
          color: tone.fg,
          boxShadow: `inset 0 0 0 2px ${tone.fg}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          padding: "0.25em",
          overflow: "hidden",
          textAlign: "center",
          fontSize: Math.max(10, Math.round(width / 9)),
          fontWeight: 700,
          lineHeight: 1.2,
          overflowWrap: "anywhere",
        }}
      >
        {label}
      </div>
    );
  }

  return (
    // biome-ignore lint/performance/noImgElement: card art is a static SVG with an error fallback; next/image adds nothing here.
    <img
      src={src}
      alt={decorative ? "" : label}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}
