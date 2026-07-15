import type { Metadata } from "next"

import { SkullKingDocsView } from "@/components/games/skull-king/docs/skull-king-docs-view"
import { SkullKingDocsShell } from "@/components/games/skull-king/docs/skull-king-docs-shell"

export const metadata: Metadata = {
  title: "Skull King · Rules · GUB",
  description: "Skull King rules, scoring, and how to use this app.",
}

export default function SkullKingDocsPage() {
  return (
    <SkullKingDocsShell
      breadcrumbs={[
        { label: "Rules", href: "/games/skull-king/docs" },
        { label: "Overview" },
      ]}
      headings={[]}
    >
      <SkullKingDocsView />
    </SkullKingDocsShell>
  )
}
