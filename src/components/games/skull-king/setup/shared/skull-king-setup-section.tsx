import type { ReactNode } from "react"

import panel from "@/components/games/skull-king/setup/styles/setup-panel.module.css"

export type SkullKingSetupSectionProps = {
  /** `id` on the `<h2>`; `aria-labelledby` on the `<section>`. */
  headingId: string
  title: string
  subtitle: string
  /** When true, the large visual title is omitted (e.g. wizard shows it in the progress strip). */
  hideTitle?: boolean
  children: ReactNode
}

/** Title + subtitle block used across Skull King setup steps. */
export function SkullKingSetupSection({
  headingId,
  title,
  subtitle,
  hideTitle = false,
  children,
}: SkullKingSetupSectionProps) {
  return (
    <section className={panel.section} aria-labelledby={headingId}>
      <header className={panel.header}>
        <h2 id={headingId} className={hideTitle ? "sr-only" : panel.title}>
          {title}
        </h2>
        <p className={panel.subtitle}>{subtitle}</p>
      </header>
      {children}
    </section>
  )
}
