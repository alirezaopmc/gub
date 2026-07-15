"use client"

import Link from "next/link"

import { useDocsArtifacts } from "@/components/docs/docs-artifact-context"
import { ARTIFACT_ROWS } from "@/components/games/skull-king/setup/artifacts/artifacts-catalog"
import { isDocVisibleForArtifacts } from "@/lib/docs/doc-artifact-visibility"

type DocsArtifactGateProps = {
  required?: string[]
  gameId?: string
  children: React.ReactNode
}

function artifactLabel(id: string): string {
  return ARTIFACT_ROWS.find((row) => row.id === id)?.label ?? id
}

export function DocsArtifactGate({
  required,
  gameId = "skull-king",
  children,
}: DocsArtifactGateProps) {
  const { options } = useDocsArtifacts()

  if (isDocVisibleForArtifacts(required, options)) {
    return children
  }

  const labels = (required ?? []).map(artifactLabel)
  const matrixHref = `/games/${gameId}/docs/reference/artifacts-matrix`

  return (
    <div className="rounded-lg border border-border bg-card/40 p-6">
      <h2 className="font-headline text-xl font-semibold text-foreground">
        Artifacts required
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This page applies when at least one of these artifacts is enabled:{" "}
        <strong className="text-foreground">{labels.join(", ")}</strong>.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Enable the matching toggles in the sidebar, or pick a preset that includes them.
      </p>
      <p className="mt-4 text-sm">
        <Link href={matrixHref} className="font-medium text-primary underline underline-offset-2">
          View artifacts matrix
        </Link>
      </p>
    </div>
  )
}
