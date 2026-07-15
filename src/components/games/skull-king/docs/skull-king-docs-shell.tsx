import type { ReactNode } from "react"

import { DocsLayout } from "@/components/docs/docs-layout"
import { buildGameDocNav } from "@/lib/docs/build-game-doc-nav"
import type { DocBreadcrumb, DocHeading } from "@/lib/docs/types"

type SkullKingDocsShellProps = {
  breadcrumbs: DocBreadcrumb[]
  headings?: DocHeading[]
  children: ReactNode
}

export function SkullKingDocsShell({
  breadcrumbs,
  headings = [],
  children,
}: SkullKingDocsShellProps) {
  const config: ReturnType<typeof buildGameDocNav> = {
    ...buildGameDocNav("skull-king"),
    activePathAliases: {
      "/games/skull-king/docs": "/games/skull-king/docs/rules/00-overview",
    },
  }

  return (
    <DocsLayout config={config} breadcrumbs={breadcrumbs} headings={headings}>
      {children}
    </DocsLayout>
  )
}
