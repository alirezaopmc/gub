import type { DocSearchEntry } from "@/lib/docs/types"

const cache = new Map<string, Promise<DocSearchEntry[]>>()

/** Lazy-load docs search index JSON (cached per game). */
export function loadDocsSearchIndex(gameId: string): Promise<DocSearchEntry[]> {
  const existing = cache.get(gameId)
  if (existing) return existing

  const promise = fetch(`/games/${gameId}/docs-search.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load docs search index for ${gameId}`)
      return res.json() as Promise<DocSearchEntry[]>
    })
    .catch((err) => {
      cache.delete(gameId)
      throw err
    })

  cache.set(gameId, promise)
  return promise
}
