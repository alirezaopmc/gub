"use client"

import { ARTIFACT_ROWS } from "@/components/games/skull-king/setup/artifacts/artifacts-catalog"
import { useDocsArtifacts } from "@/components/docs/docs-artifact-context"
import styles from "@/components/docs/styles/artifact-filter.module.css"
import {
  ARTIFACT_PRESET_IDS,
  type ArtifactPresetId,
  artifactOptionsForPreset,
  matchArtifactPreset,
} from "@/lib/games/skull-king/artifacts"
import { cn } from "@/lib/utils"

const PRESET_LABELS: Record<ArtifactPresetId, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
}

type ArtifactFilterProps = {
  className?: string
}

export function ArtifactFilter({ className }: ArtifactFilterProps) {
  const { options, setArtifactOptions, toggleArtifact } = useDocsArtifacts()
  const activePreset = matchArtifactPreset(options)

  return (
    <div className={cn("mb-4", className)}>
      <p className="mb-2 px-2 font-headline text-xs font-bold uppercase tracking-wider text-primary">
        Artifacts
      </p>
      <div className="px-2">
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
            <div key={row.id} role="listitem">
              <button
                type="button"
                role="switch"
                aria-checked={options[row.id]}
                aria-label={row.label}
                data-on={options[row.id] ? "true" : "false"}
                className={styles.row}
                onClick={() => toggleArtifact(row.id)}
              >
                <row.Icon className={styles.icon} aria-hidden />
                <span className={styles.rowLabel}>{row.label}</span>
                <span className={styles.switch} aria-hidden>
                  <span className={styles.switchThumb} />
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
