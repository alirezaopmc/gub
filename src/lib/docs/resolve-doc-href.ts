import path from "node:path"

function isExternalHref(href: string): boolean {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#")
  )
}

/** Map a docs-relative path (e.g. games/skull-king/rules/06-scoring.md) to an app route. */
export function docsRelativePathToRoute(relativePath: string): string | null {
  return docPathToRoute(relativePath)
}

function docPathToRoute(resolvedPath: string): string | null {
  const withoutExt = resolvedPath.replace(/\.mdx?$/, "")

  // ponytail: existing docs use ../../shared from rules; normalizes to games/shared
  const normalized = withoutExt.startsWith("games/shared/")
    ? withoutExt.replace(/^games\/shared\//, "shared/")
    : withoutExt

  const skullKingApp = normalized.match(/^games\/skull-king\/app\/(.+)$/)
  if (skullKingApp) {
    return `/games/skull-king/docs/${skullKingApp[1]}`
  }

  const skullKingRules = normalized.match(/^games\/skull-king\/rules\/(.+)$/)
  if (skullKingRules) {
    return `/games/skull-king/docs/rules/${skullKingRules[1]}`
  }

  const skullKingReference = normalized.match(/^games\/skull-king\/reference\/(.+)$/)
  if (skullKingReference) {
    return `/games/skull-king/docs/reference/${skullKingReference[1]}`
  }

  const shared = normalized.match(/^shared\/(.+)$/)
  if (shared) {
    return `/docs/shared/${shared[1]}`
  }

  return null
}

/** Map a relative markdown href to an in-app route, or null if external/unmapped. */
export function resolveDocHref(fromPath: string, href: string): string | null {
  if (isExternalHref(href)) {
    return null
  }

  if (href.startsWith("/")) {
    return href
  }

  const fromDir = path.dirname(fromPath)
  const resolved = path.normalize(path.join(fromDir, href))
  return docPathToRoute(resolved)
}
