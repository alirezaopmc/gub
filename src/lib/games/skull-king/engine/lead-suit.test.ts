import { describe, expect, it } from "vitest";

import { createCard } from "@/lib/games/skull-king/engine/cards";
import { resolveLeadContext } from "@/lib/games/skull-king/engine/lead-suit";
import { createPlayedCard } from "@/lib/games/skull-king/engine/trick-resolution";

describe("lead-suit", () => {
  const escape = createCard({ kind: "escape", index: 0 });
  const green7 = createCard({ kind: "suited", suit: "green", rank: 7 });
  const pirate = createCard({ kind: "pirate", pirate: "rosie" });
  const loot = createCard({ kind: "loot", index: 0 });

  it("suited lead sets suit", () => {
    const ctx = resolveLeadContext([createPlayedCard(green7, 0, 0)]);
    expect(ctx.leadSuit).toBe("green");
    expect(ctx.awaitingSuit).toBe(false);
  });

  it("escape lead awaits suit until suited played", () => {
    const ctx = resolveLeadContext([
      createPlayedCard(escape, 0, 0),
      createPlayedCard(green7, 1, 1),
    ]);
    expect(ctx.leadSuit).toBe("green");
  });

  it("escape chain until suited", () => {
    const e2 = createCard({ kind: "escape", index: 1 });
    const ctx = resolveLeadContext([
      createPlayedCard(escape, 0, 0),
      createPlayedCard(e2, 1, 1),
      createPlayedCard(green7, 2, 2),
    ]);
    expect(ctx.leadSuit).toBe("green");
  });

  it("character lead has no suit", () => {
    const ctx = resolveLeadContext([createPlayedCard(pirate, 0, 0)]);
    expect(ctx.leadSuit).toBeNull();
  });

  it("loot lead uses next suited", () => {
    const ctx = resolveLeadContext([
      createPlayedCard(loot, 0, 0),
      createPlayedCard(
        createCard({ kind: "suited", suit: "purple", rank: 3 }),
        1,
        1,
      ),
    ]);
    expect(ctx.leadSuit).toBe("purple");
  });

  describe("escapeLeadDefersThroughCharacters rule flag", () => {
    it("default (false): character played after escape ends suit selection (no suit established)", () => {
      const plays = [
        createPlayedCard(escape, 0, 0),
        createPlayedCard(pirate, 1, 1),
        createPlayedCard(green7, 2, 2),
      ];
      // Default / false
      const ctxDefault = resolveLeadContext(plays);
      expect(ctxDefault.leadSuit).toBeNull();
      expect(ctxDefault.awaitingSuit).toBe(false);

      const ctxExplicitFalse = resolveLeadContext(plays, {
        escapeLeadDefersThroughCharacters: false,
      });
      expect(ctxExplicitFalse.leadSuit).toBeNull();
      expect(ctxExplicitFalse.awaitingSuit).toBe(false);
    });

    it("true: character played after escape defers suit selection to subsequent suited card", () => {
      const plays = [
        createPlayedCard(escape, 0, 0),
        createPlayedCard(pirate, 1, 1),
        createPlayedCard(green7, 2, 2),
      ];
      const ctxTrue = resolveLeadContext(plays, {
        escapeLeadDefersThroughCharacters: true,
      });
      expect(ctxTrue.leadSuit).toBe("green");
      expect(ctxTrue.awaitingSuit).toBe(false);
    });
  });
});
