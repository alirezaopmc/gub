import { buildGameDocNav } from "@/lib/docs/build-game-doc-nav"
import type { DocBreadcrumb, DocFrontmatter } from "@/lib/docs/types"

/** Breadcrumb trail: section root link + current page title. */
export function buildDocBreadcrumbs(gameId: string, frontmatter: DocFrontmatter): DocBreadcrumb[] {
  const section = frontmatter.section
  if (!section) {
    return [{ label: frontmatter.title }]
  }

  const nav = buildGameDocNav(gameId)
  const group = nav.groups.find((g) => g.section === section)
  const sectionRoot = group?.items[0]

  if (!sectionRoot) {
    return [{ label: frontmatter.title }]
  }

  return [
    { label: group.label, href: sectionRoot.href },
    { label: frontmatter.title },
  ]
}
