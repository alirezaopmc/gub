const SKULL_KING_GAME_ID = "skull-king"

export type SkullKingDocSection = "rules" | "reference" | "app"

/** Map a route section + slug to a docs-relative path. */
export function skullKingDocPath(section: SkullKingDocSection, slug: string): string {
  return `games/${SKULL_KING_GAME_ID}/${section}/${slug}.md`
}
