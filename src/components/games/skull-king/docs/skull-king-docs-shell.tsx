import type { ReactNode } from "react"

import { ArtifactFilter } from "@/components/docs/artifact-filter"
import { DocsArtifactProvider } from "@/components/docs/docs-artifact-context"
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
  const config = buildGameDocNav("skull-king")

  return (
    <DocsArtifactProvider>
      <DocsLayout
        config={config}
        breadcrumbs={breadcrumbs}
        headings={headings}
        artifactFilter={<ArtifactFilter />}
      >
        {children}
      </DocsLayout>
    </DocsArtifactProvider>
  )
}
