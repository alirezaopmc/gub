import { describe, expect, it } from "vitest"

import { isDocVisibleForArtifacts } from "@/lib/docs/doc-artifact-visibility"
import { Artifacts, artifactOptionsForPreset } from "@/lib/games/skull-king/artifacts"

describe("isDocVisibleForArtifacts", () => {
  const beginner = artifactOptionsForPreset("beginner")
  const intermediate = artifactOptionsForPreset("intermediate")
  const expert = artifactOptionsForPreset("expert")

  it("shows pages with no artifact requirement", () => {
    expect(isDocVisibleForArtifacts(undefined, beginner)).toBe(true)
    expect(isDocVisibleForArtifacts([], beginner)).toBe(true)
  })

  it("hides multi-artifact pages when none are enabled", () => {
    const required = ["Kraken", "Whale", "Loot"]
    expect(isDocVisibleForArtifacts(required, beginner)).toBe(false)
  })

  it("uses OR logic for multi-artifact pages", () => {
    const required = ["Kraken", "Whale", "Loot"]
    expect(isDocVisibleForArtifacts(required, intermediate)).toBe(true)
    expect(isDocVisibleForArtifacts(required, expert)).toBe(true)
  })

  it("hides PirateAbilities page for beginner and intermediate", () => {
    const required = [Artifacts.PirateAbilities]
    expect(isDocVisibleForArtifacts(required, beginner)).toBe(false)
    expect(isDocVisibleForArtifacts(required, intermediate)).toBe(false)
    expect(isDocVisibleForArtifacts(required, expert)).toBe(true)
  })
})
