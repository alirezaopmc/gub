export type DocAudience = "player" | "user" | "contributor"

export type DocFrontmatter = {
  title: string
  description: string
  audience: DocAudience
  game?: string
  section?: string
  order?: number
  artifacts?: string[]
  source?: string
}

export type LoadedDoc = {
  frontmatter: DocFrontmatter
  content: string
  filePath: string
  relativePath: string
}

export type DocNavItem = {
  title: string
  href: string
  artifacts?: string[]
}

export type DocNavGroup = {
  label: string
  section: string
  items: DocNavItem[]
}

export type DocNavConfig = {
  gameId?: string
  gameTitle: string
  groups: DocNavGroup[]
  /** Map a pathname to the nav href that should show as active (legacy routes until #21). */
  activePathAliases?: Record<string, string>
}

export type DocSearchKind = "page" | "heading" | "glossary"

export type DocSearchEntry = {
  id: string
  kind: DocSearchKind
  title: string
  subtitle?: string
  href: string
  keywords?: string[]
  artifacts?: string[]
}

export type DocHeading = {
  id: string
  text: string
  level: 2 | 3
}

export type DocBreadcrumb = {
  label: string
  href?: string
}
