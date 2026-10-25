import { mkdirSync, writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildGameDocSearchIndex } from "@/lib/docs/build-game-doc-search-index";

describe("generate docs search index", () => {
  it("writes docs-search.json for games", () => {
    for (const gameId of ["skull-king", "scout", "sea-salt-paper"]) {
      const index = buildGameDocSearchIndex(gameId);
      mkdirSync(`public/games/${gameId}`, { recursive: true });
      writeFileSync(
        `public/games/${gameId}/docs-search.json`,
        `${JSON.stringify(index, null, 2)}\n`,
      );
      if (gameId === "skull-king") {
        expect(index.length).toBeGreaterThan(0);
      }
    }
  });
});
