import { ARTIFACT_ROWS } from "@/components/games/skull-king/setup/artifacts/artifacts-catalog"
import { CrewList } from "@/components/games/skull-king/shared/crew-list"
import { cn } from "@/lib/utils"
import type { SkullKingGameConfig } from "@/lib/games/skull-king/skull-king-game-config"

const sectionLabel =
  "font-label text-xs font-medium uppercase tracking-wider text-muted-foreground"

const roundSchemaDataCell =
  "min-w-8 border-b border-border/35 px-1.5 py-2 text-center font-mono text-sm font-medium tabular-nums text-foreground first:pl-0 last:pr-0 sm:min-w-9"

const roundSchemaDataCellLastRow =
  "min-w-8 px-1.5 py-2 text-center font-mono text-sm font-medium tabular-nums text-foreground first:pl-0 last:pr-0 sm:min-w-9"

/** Row axis labels — subordinate to the section title (no label caps / tracking). */
const roundSchemaRowHeader =
  "w-[4.25rem] shrink-0 pl-0 pr-3 text-left align-middle text-xs font-normal tracking-normal text-muted-foreground/75 sm:w-24"
const roundSchemaRowLabel = `${roundSchemaRowHeader} border-b border-border/35`
const roundSchemaRowLabelLastRow = roundSchemaRowHeader

function RoundSchemaTable({ roundsSchema }: { roundsSchema: readonly number[] }) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto">
      <table
        className="w-full min-w-min border-collapse text-sm"
        aria-label="Tricks per round, in order"
      >
        <caption className="sr-only">Each column is one round: round number, then hand size in cards.</caption>
        <tbody>
          <tr>
            <th scope="row" className={roundSchemaRowLabel}>
              Round
            </th>
            {roundsSchema.map((_, i) => {
              const n = i + 1
              return (
                <td key={i} className={roundSchemaDataCell}>
                  {n}
                </td>
              )
            })}
          </tr>
          <tr>
            <th scope="row" className={roundSchemaRowLabelLastRow}>
              Cards
            </th>
            {roundsSchema.map((cards, i) => (
              <td key={i} className={roundSchemaDataCellLastRow}>
                {cards}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ArtifactReviewList({ config }: { config: SkullKingGameConfig }) {
  const enabled = ARTIFACT_ROWS.filter((r) => config.options[r.id] === true)
  const disabled = ARTIFACT_ROWS.filter((r) => !config.options[r.id])
  const ordered = [...enabled, ...disabled]

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Game artifacts">
      {ordered.map((row) => {
        const on = config.options[row.id] === true
        const Icon = row.Icon
        return (
          <li
            key={row.id}
            className={cn(
              "flex w-full min-w-0 items-center gap-1 rounded border border-border py-0.5 pl-1 pr-1 shadow-sm",
              on
                ? "border-l-2 border-l-primary bg-card"
                : "border-l-2 border-l-transparent bg-muted/40"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                on ? "text-primary" : "text-muted-foreground opacity-60"
              )}
              aria-hidden
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left font-label text-sm font-medium uppercase tracking-wider leading-snug",
                on ? "text-foreground" : "text-muted-foreground"
              )}
              title={row.label}
            >
              {row.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function GameReadyReview({ config }: { config: SkullKingGameConfig }) {
  const playerCount = config.players.filter((n) => n.trim() !== "").length
  const activeArtifactCount = ARTIFACT_ROWS.filter(
    (r) => config.options[r.id] === true
  ).length
  const artifactTotal = ARTIFACT_ROWS.length

  return (
    <div className="flex w-full min-w-0 flex-col gap-8 text-left">
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-labelledby="sk-game-ready-rounds"
      >
        <h2 id="sk-game-ready-rounds" className={sectionLabel}>
          Round schema
        </h2>
        <RoundSchemaTable roundsSchema={config.roundsSchema} />
      </section>

      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(5.75rem,7rem)] items-start gap-x-4 gap-y-6 sm:gap-x-6 sm:gap-y-8">
        <section
          className="flex min-w-0 flex-col gap-3"
          aria-labelledby="sk-game-ready-crew"
        >
          <h2 id="sk-game-ready-crew" className={sectionLabel}>
            Crew <span className="tabular-nums">({playerCount})</span>
          </h2>
          <CrewList players={config.players} />
        </section>

        <section
          className="flex min-w-0 max-w-full flex-col gap-3"
          aria-labelledby="sk-game-ready-artifacts"
        >
          <h2 id="sk-game-ready-artifacts" className={sectionLabel}>
            Artifacts{" "}
            <span className="tabular-nums">
              ({activeArtifactCount}/{artifactTotal})
            </span>
          </h2>
          <ArtifactReviewList config={config} />
        </section>
      </div>
    </div>
  )
}
