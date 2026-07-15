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
