import type { Metadata } from "next"

import { DocsArtifactGate } from "@/components/docs/docs-artifact-gate"
import { DocsMdxContent } from "@/components/docs/docs-mdx-content"
import { SkullKingDocsShell } from "@/components/games/skull-king/docs/skull-king-docs-shell"
import { buildDocBreadcrumbs } from "@/lib/docs/build-doc-breadcrumbs"
import { extractHeadings } from "@/lib/docs/extract-headings"
import { loadDoc } from "@/lib/docs/load-doc"

const GAME_ID = "skull-king"

export function skullKingDocMetadata(relativePath: string): Metadata {
  const { frontmatter } = loadDoc(relativePath)

  return {
    title: `${frontmatter.title} · Skull King · GUB`,
    description: frontmatter.description,
  }
}

type SkullKingDocPageProps = {
  relativePath: string
}

export async function SkullKingDocPage({ relativePath }: SkullKingDocPageProps) {
  const { content, frontmatter } = loadDoc(relativePath)
  const headings = extractHeadings(content)

  return (
    <SkullKingDocsShell
      breadcrumbs={buildDocBreadcrumbs(GAME_ID, frontmatter)}
      headings={headings}
    >
      <DocsArtifactGate required={frontmatter.artifacts} gameId={GAME_ID}>
        <DocsMdxContent relativePath={relativePath} />
      </DocsArtifactGate>
    </SkullKingDocsShell>
  )
}
