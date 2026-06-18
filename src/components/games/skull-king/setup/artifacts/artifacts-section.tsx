"use client"

import { ArtifactRow } from "@/components/games/skull-king/setup/artifacts/artifact-row"
import { ARTIFACT_ROWS } from "@/components/games/skull-king/setup/artifacts/artifacts-catalog"
import { SkullKingSetupSection } from "@/components/games/skull-king/setup/shared/skull-king-setup-section"
import styles from "@/components/games/skull-king/setup/styles/cursed-artifacts.module.css"
import {
  ARTIFACT_PRESET_IDS,
  type ArtifactPresetId,
  artifactOptionsForPreset,
  matchArtifactPreset,
} from "@/lib/games/skull-king/artifacts"
import { useSkullKingStore } from "@/lib/games/skull-king/skull-king-store"

const HEADING_ID = "artifacts-heading"

const PRESET_LABELS: Record<ArtifactPresetId, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
}

export function ArtifactsSection() {
  const options = useSkullKingStore((s) => s.options)
  const toggleArtifact = useSkullKingStore((s) => s.toggleArtifact)
  const setArtifactOptions = useSkullKingStore((s) => s.setArtifactOptions)
  const activePreset = matchArtifactPreset(options)

  return (
    <SkullKingSetupSection
      headingId={HEADING_ID}
      title="Artifacts"
      subtitle="Toggle active expansions and special cards."
      hideTitle
    >
      <div className={styles.presetGroup} role="group" aria-label="Artifact presets">
        {ARTIFACT_PRESET_IDS.map((presetId) => (
          <button
            key={presetId}
            type="button"
            className={styles.presetTab}
            data-active={activePreset === presetId ? "true" : "false"}
            aria-pressed={activePreset === presetId}
            onClick={() => setArtifactOptions(artifactOptionsForPreset(presetId))}
          >
            {PRESET_LABELS[presetId]}
          </button>
        ))}
      </div>
      <div className={styles.list} role="list">
        {ARTIFACT_ROWS.map((row) => (
          <ArtifactRow
            key={row.id}
            {...row}
            on={options[row.id]}
            onToggle={() => toggleArtifact(row.id)}
          />
        ))}
      </div>
    </SkullKingSetupSection>
  )
}
