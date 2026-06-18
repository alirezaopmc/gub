import { cn } from "@/lib/utils"

export type CrewListVariant = "numbered" | "sessionCard"

export type CrewListProps = {
  players: readonly string[]
  variant?: CrewListVariant
  className?: string
}

/** Renders non-empty trimmed crew names. Empty list shows an em dash placeholder. */
export function CrewList({ players, variant = "numbered", className }: CrewListProps) {
  const names = players.filter((n) => n.trim() !== "")

  if (names.length === 0 && variant !== "sessionCard") {
    return <p className={cn("text-sm text-muted-foreground", className)}>—</p>
  }

  if (variant === "sessionCard") {
    if (names.length === 0) {
      return (
        <p className={cn("m-0 text-sm text-muted-foreground", className)}>—</p>
      )
    }
    const line = names.map((name) => name.trim()).join(", ")
    return (
      <p
        className={cn(
          "m-0 font-headline text-sm font-semibold leading-snug break-words text-foreground",
          className
        )}
      >
        {line}
      </p>
    )
  }

  return (
    <ol className={cn("m-0 flex w-full list-none flex-col gap-2 p-0", className)}>
      {names.map((name, i) => {
        const trimmed = name.trim()
        return (
          <li key={`${name}-${i}`} className="flex min-w-0 items-baseline gap-2">
            <span
              className="w-5 shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground"
              aria-hidden
            >
              {i + 1}.
            </span>
            <span
              className="min-w-0 truncate font-headline text-sm font-medium text-foreground"
              title={trimmed}
            >
              {trimmed}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
