/**
 * Generates the original Skull King card art as SVG.
 *
 * Output: public/games/skull-king/cards/*.svg (deterministic; safe to re-run).
 * Run: bun run generate:card-art
 *
 * All artwork is drawn here from basic shapes. Do not add third-party card art.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CARD_PALETTE,
  type CardTone,
  cardToneKey,
} from "../src/lib/games/skull-king/engine/card-palette";
import {
  CARD_BACK_IMAGE,
  cardImagePath,
  cardLabel,
  createCard,
} from "../src/lib/games/skull-king/engine/cards";
import type {
  CardKind,
  MermaidId,
  PirateId,
  StandardSuit,
} from "../src/lib/games/skull-king/engine/types";

export const CARD_ART_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/games/skull-king/cards",
);

const SUITS: StandardSuit[] = ["green", "yellow", "purple", "black"];
const PIRATES: PirateId[] = ["rosie", "bendt", "rascal", "juanita", "harry"];
const MERMAIDS: MermaidId[] = ["alyra", "sirena"];
const FONT =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Every card definition the engine can produce, including all escape and loot indexes. */
export function allCardDefs(): CardKind[] {
  const defs: CardKind[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 14; rank++) {
      defs.push({ kind: "suited", suit, rank });
    }
  }
  for (let index = 0; index < 5; index++) {
    defs.push({ kind: "escape", index });
    defs.push({ kind: "loot", index });
  }
  for (const pirate of PIRATES) defs.push({ kind: "pirate", pirate });
  defs.push({ kind: "tigress" });
  defs.push({ kind: "skull_king" });
  for (const mermaid of MERMAIDS) defs.push({ kind: "mermaid", mermaid });
  defs.push({ kind: "kraken" });
  defs.push({ kind: "whale" });
  return defs;
}

export type CardArtEntry = {
  /** Public path as cardImagePath / CARD_BACK_IMAGE return it. */
  publicPath: string;
  /** File name inside CARD_ART_DIR. */
  fileName: string;
  svg: string;
};

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function svgDocument(label: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 350" width="250" height="350">
<title>${xmlEscape(label)}</title>
<desc>Card: ${xmlEscape(label)}</desc>
<rect x="2" y="2" width="246" height="346" rx="18" ry="18" fill="#fdfaf3" stroke="#1b1b1b" stroke-width="2"/>
${body}
</svg>
`;
}

/** Colour-filled card face with a thin inner border. */
function faceFrame(tone: CardTone): string {
  return `<rect x="2" y="2" width="246" height="346" rx="18" ry="18" fill="${tone.bg}"/>
<rect x="12" y="12" width="226" height="326" rx="12" ry="12" fill="none" stroke="${tone.fg}" stroke-width="2"/>`;
}

function cornerRank(rank: number, tone: CardTone): string {
  const text = `<text x="22" y="52" font-family="${FONT}" font-size="40" font-weight="700" fill="${tone.fg}">${rank}</text>`;
  return `${text}\n<g transform="rotate(180 125 175)">${text}</g>`;
}

function suitIcon(suit: StandardSuit, tone: CardTone): string {
  const fg = tone.fg;
  const bg = tone.bg;
  switch (suit) {
    case "green":
      // Parrot: body, head with beak, eye, wing cut-out and tail.
      return `<ellipse cx="128" cy="184" rx="34" ry="46" fill="${fg}"/>
<circle cx="132" cy="128" r="24" fill="${fg}"/>
<path d="M152 122 L180 134 L152 142 Z" fill="${fg}"/>
<circle cx="140" cy="121" r="5" fill="${bg}"/>
<path d="M100 150 Q78 190 104 228 Q118 200 110 170 Z" fill="${bg}"/>
<path d="M118 224 L106 266 L126 254 L134 268 L142 226 Z" fill="${fg}"/>`;
    case "yellow":
      // Treasure chest: lid, body, straps and lock.
      return `<path d="M72 150 Q72 116 125 116 Q178 116 178 150 Z" fill="${fg}"/>
<rect x="72" y="150" width="106" height="80" rx="6" ry="6" fill="${fg}"/>
<rect x="72" y="142" width="106" height="8" fill="${bg}"/>
<rect x="92" y="150" width="6" height="80" fill="${bg}"/>
<rect x="152" y="150" width="6" height="80" fill="${bg}"/>
<rect x="114" y="150" width="22" height="28" rx="3" ry="3" fill="${bg}"/>
<circle cx="125" cy="160" r="4" fill="${fg}"/>`;
    case "purple":
      // Pirate map: folded parchment with an X and a dashed route.
      return `<path d="M68 110 L100 122 L132 110 L164 122 L182 112 L182 240 L164 250 L132 238 L100 250 L68 238 Z" fill="${fg}"/>
<path d="M112 158 L138 184 M138 158 L112 184" stroke="${bg}" stroke-width="7" stroke-linecap="round"/>
<path d="M80 230 Q100 200 118 214 T150 196" fill="none" stroke="${bg}" stroke-width="3" stroke-dasharray="5 5"/>`;
    case "black":
      // Jolly Roger: skull with crossbones.
      return `<path d="M125 96 C92 96 74 120 74 148 C74 166 84 176 96 180 L96 204 L154 204 L154 180 C166 176 176 166 176 148 C176 120 158 96 125 96 Z" fill="${fg}"/>
<circle cx="104" cy="148" r="14" fill="${bg}"/>
<circle cx="146" cy="148" r="14" fill="${bg}"/>
<path d="M125 162 L118 176 L132 176 Z" fill="${bg}"/>
<path d="M110 188 V204 M125 188 V204 M140 188 V204" stroke="${bg}" stroke-width="4"/>
<path d="M72 226 L178 288 M178 226 L72 288" stroke="${fg}" stroke-width="10" stroke-linecap="round"/>`;
  }
}

const SUIT_ICON_NAME: Record<StandardSuit, string> = {
  green: "parrot",
  yellow: "chest",
  purple: "map",
  black: "skull",
};

function labelLines(label: string): string[] {
  if (label.length <= 14) return [label];
  const space = label.indexOf(" ");
  return [label.slice(0, space), label.slice(space + 1)];
}

function nameText(label: string, tone: CardTone): string {
  const lines = labelLines(label);
  const baseY = lines.length === 1 ? 292 : 280;
  return lines
    .map(
      (line, i) =>
        `<text x="125" y="${baseY + i * 20}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="700" fill="${tone.fg}">${xmlEscape(line)}</text>`,
    )
    .join("\n");
}

function specialGlyph(def: CardKind, tone: CardTone): string {
  const fg = tone.fg;
  const bg = tone.bg;
  switch (def.kind) {
    case "escape":
      return `<rect x="92" y="96" width="66" height="150" rx="4" ry="4" fill="none" stroke="${fg}" stroke-width="8"/>
<path d="M118 172 L172 172 M158 156 L176 172 L158 188" fill="none" stroke="${fg}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "pirate":
      return `<path d="M74 140 L125 100 L176 140 Z" fill="${fg}" stroke="${bg}" stroke-width="4" stroke-linejoin="round"/>
<circle cx="125" cy="170" r="46" fill="${fg}"/>
<rect x="98" y="158" width="26" height="16" rx="6" ry="6" fill="${bg}"/>
<circle cx="146" cy="166" r="6" fill="${bg}"/>
<path d="M110 196 Q125 206 140 196" fill="none" stroke="${bg}" stroke-width="5" stroke-linecap="round"/>`;
    case "tigress":
      return `<path d="M80 130 L92 92 L120 120 Z M170 130 L158 92 L130 120 Z" fill="${fg}"/>
<circle cx="125" cy="150" r="48" fill="${fg}"/>
<ellipse cx="104" cy="146" rx="7" ry="5" fill="${bg}"/>
<ellipse cx="146" cy="146" rx="7" ry="5" fill="${bg}"/>
<path d="M125 110 V124 M110 112 L114 124 M140 112 L136 124" stroke="${bg}" stroke-width="5" stroke-linecap="round"/>
<path d="M120 166 H130 L125 172 Z" fill="${bg}"/>`;
    case "skull_king":
      return `<path d="M84 190 L84 128 L106 156 L125 110 L144 156 L166 128 L166 190 Z" fill="${fg}" stroke="${bg}" stroke-width="4" stroke-linejoin="round"/>
<rect x="84" y="180" width="82" height="16" fill="${fg}"/>
<circle cx="125" cy="170" r="6" fill="${bg}"/>
<circle cx="104" cy="170" r="4" fill="${bg}"/>
<circle cx="146" cy="170" r="4" fill="${bg}"/>`;
    case "mermaid":
      return `<circle cx="125" cy="126" r="26" fill="${fg}"/>
<path d="M104 150 H146 L162 192 Q176 206 170 222 Q154 214 146 204 Q134 232 125 246 Q116 232 104 204 Q96 214 80 222 Q74 206 88 192 Z" fill="${fg}"/>
<circle cx="116" cy="122" r="4" fill="${bg}"/>
<circle cx="134" cy="122" r="4" fill="${bg}"/>`;
    case "kraken":
      return `<circle cx="125" cy="140" r="36" fill="${fg}"/>
<circle cx="112" cy="134" r="6" fill="${bg}"/>
<circle cx="138" cy="134" r="6" fill="${bg}"/>
<path d="M96 160 Q70 190 88 220 Q100 240 84 262 M112 172 Q104 210 116 236 Q122 252 112 270 M138 172 Q146 210 134 236 Q128 252 138 270 M154 160 Q180 190 162 220 Q150 240 166 262" fill="none" stroke="${fg}" stroke-width="12" stroke-linecap="round"/>`;
    case "loot":
      return `<path d="M108 120 Q125 100 142 120" fill="none" stroke="${fg}" stroke-width="6" stroke-linecap="round"/>
<path d="M92 150 Q92 120 125 120 Q158 120 158 150 L170 230 Q170 246 152 246 L98 246 Q80 246 80 230 Z" fill="${fg}"/>
<circle cx="125" cy="190" r="14" fill="${bg}"/>
<circle cx="125" cy="190" r="6" fill="${fg}"/>`;
    case "whale":
      return `<path d="M70 190 Q80 150 130 150 Q170 150 178 180 L196 166 L192 200 L178 214 Q150 240 110 230 Q76 224 70 190 Z" fill="${fg}"/>
<circle cx="100" cy="186" r="5" fill="${bg}"/>
<path d="M118 146 Q112 120 102 112 M118 146 Q126 120 136 112" fill="none" stroke="${fg}" stroke-width="5" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

function renderCard(def: CardKind): string {
  const card = createCard(def);
  const label = cardLabel(card);
  const tone = CARD_PALETTE[cardToneKey(def)];
  if (def.kind === "suited") {
    const iconBody = suitIcon(def.suit, tone);
    return svgDocument(
      label,
      `${faceFrame(tone)}
${cornerRank(def.rank, tone)}
<g data-icon="${SUIT_ICON_NAME[def.suit]}">
${iconBody}
</g>`,
    );
  }
  return svgDocument(
    label,
    `${faceFrame(tone)}
${specialGlyph(def, tone)}
${nameText(label, tone)}`,
  );
}

function renderBack(): string {
  const tone = CARD_PALETTE.back;
  const diamonds: string[] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 6; col++) {
      const cx = 22 + col * 42 + (row % 2) * 21;
      const cy = 40 + row * 46;
      if (cx > 240 || cy > 330) continue;
      diamonds.push(
        `M${cx} ${cy - 9} L${cx + 9} ${cy} L${cx} ${cy + 9} L${cx - 9} ${cy} Z`,
      );
    }
  }
  return svgDocument(
    "Card back",
    `<rect x="2" y="2" width="246" height="346" rx="18" ry="18" fill="${tone.bg}"/>
<rect x="12" y="12" width="226" height="326" rx="12" ry="12" fill="none" stroke="${tone.fg}" stroke-width="2"/>
<path d="${diamonds.join(" ")}" fill="#2c4470"/>
<circle cx="125" cy="175" r="48" fill="${tone.bg}" stroke="${tone.fg}" stroke-width="3"/>
<path d="M125 147 L149 175 L125 203 L101 175 Z" fill="${tone.fg}"/>`,
  );
}

/** One entry per distinct public path, in deterministic order. */
export function cardArtEntries(): CardArtEntry[] {
  const seen = new Set<string>();
  const entries: CardArtEntry[] = [];
  for (const def of allCardDefs()) {
    const publicPath = cardImagePath(createCard(def));
    if (seen.has(publicPath)) continue;
    seen.add(publicPath);
    entries.push({
      publicPath,
      fileName: path.basename(publicPath),
      svg: renderCard(def),
    });
  }
  entries.push({
    publicPath: CARD_BACK_IMAGE,
    fileName: path.basename(CARD_BACK_IMAGE),
    svg: renderBack(),
  });
  return entries;
}

export function writeCardArt(outDir: string = CARD_ART_DIR): number {
  mkdirSync(outDir, { recursive: true });
  const entries = cardArtEntries();
  for (const entry of entries) {
    writeFileSync(path.join(outDir, entry.fileName), entry.svg, "utf8");
  }
  return entries.length;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const count = writeCardArt();
  console.log(`Wrote ${count} card SVGs to ${CARD_ART_DIR}`);
}
