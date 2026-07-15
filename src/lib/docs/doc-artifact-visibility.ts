import { Artifacts } from "@/lib/games/skull-king/artifacts"

/** Page visible when artifacts is empty/omitted, or any listed artifact is enabled. */
export function isDocVisibleForArtifacts(
  required: string[] | undefined,
  active: Record<Artifacts, boolean>,
): boolean {
  if (!required || required.length === 0) return true
  return required.some((key) => active[key as Artifacts] === true)
}
