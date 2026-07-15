import type { Metadata } from "next"

import { DocsMdxContent } from "@/components/docs/docs-mdx-content"
import { SkullKingDocsShell } from "@/components/games/skull-king/docs/skull-king-docs-shell"
import { skullKingDocMetadata } from "@/components/games/skull-king/docs/skull-king-doc-page"
import { extractHeadings } from "@/lib/docs/extract-headings"
import { loadDoc } from "@/lib/docs/load-doc"

const RELATIVE_PATH = "shared/glossary.md"
const OVERVIEW_HREF = "/games/skull-king/docs/rules/00-overview"

export const metadata: Metadata = skullKingDocMetadata(RELATIVE_PATH)

export default async function SkullKingGlossaryPage() {
  const { content, frontmatter } = loadDoc(RELATIVE_PATH)
  const headings = extractHeadings(content)

  return (
    <SkullKingDocsShell
      breadcrumbs={[
        { label: "Overview", href: OVERVIEW_HREF },
        { label: frontmatter.title },
      ]}
      headings={headings}
    >
      <DocsMdxContent relativePath={RELATIVE_PATH} />
    </SkullKingDocsShell>
  )
}
