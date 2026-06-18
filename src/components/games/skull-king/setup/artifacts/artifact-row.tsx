import type { ArtifactRowConfig } from "@/components/games/skull-king/setup/artifacts/artifacts-catalog"
import styles from "@/components/games/skull-king/setup/styles/cursed-artifacts.module.css"

export type ArtifactRowProps = ArtifactRowConfig & {
  on: boolean
  onToggle: () => void
}

export function ArtifactRow({ id, label, Icon, on, onToggle }: ArtifactRowProps) {
  const labelId = `artifact-${id}-label`

  return (
    <div className={styles.listItem} role="listitem">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        data-on={on ? "true" : "false"}
        className={styles.row}
        onClick={onToggle}
      >
        <Icon className={styles.icon} aria-hidden />
        <span id={labelId} className={styles.rowLabel}>
          {label}
        </span>
        <span className={styles.switch} aria-hidden>
          <span className={styles.switchThumb} />
        </span>
      </button>
    </div>
  )
}
