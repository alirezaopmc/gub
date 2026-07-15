import { describe, expect, it } from "vitest"

import {
  defaultCardRefLabel,
  resolveCardRefId,
  resolveCardRefImagePath,
} from "@/lib/docs/card-ref-ids"

describe("card-ref-ids", () => {
  it("resolves known special card ids", () => {
    expect(resolveCardRefId("kraken").def).toEqual({ kind: "kraken" })
    expect(resolveCardRefId("whale").def).toEqual({ kind: "whale" })
    expect(resolveCardRefId("loot").def).toEqual({ kind: "loot", index: 0 })
    expect(resolveCardRefId("skull-king").def).toEqual({ kind: "skull_king" })
  })

  it("resolves generic character defaults", () => {
    expect(resolveCardRefId("pirate").def).toEqual({ kind: "pirate", pirate: "rosie" })
    expect(resolveCardRefId("mermaid").def).toEqual({ kind: "mermaid", mermaid: "alyra" })
  })

  it("resolves specific pirate and mermaid variants", () => {
    expect(resolveCardRefId("pirate-rascal").def).toEqual({ kind: "pirate", pirate: "rascal" })
    expect(resolveCardRefId("mermaid-sirena").def).toEqual({ kind: "mermaid", mermaid: "sirena" })
  })

  it("maps ids to card image paths", () => {
    expect(resolveCardRefImagePath("kraken")).toBe("/games/skull-king/cards/kraken.png")
    expect(resolveCardRefImagePath("pirate")).toBe(
      "/games/skull-king/cards/pirate_rosie_d_laney.png",
    )
  })

  it("throws for unknown ids", () => {
    expect(() => resolveCardRefId("not-a-card")).toThrow(/Unknown card ref id/)
  })

  it("provides default labels", () => {
    expect(defaultCardRefLabel("skull-king")).toBe("Skull King")
    expect(defaultCardRefLabel("pirate-rascal")).toBe("Pirate Rascal")
  })
})
