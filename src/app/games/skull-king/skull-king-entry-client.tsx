"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EphemeralToast } from "@/components/ui/ephemeral-toast"
import { CrewList } from "@/components/games/skull-king/shared/crew-list"
import { HoldToConfirmErase } from "@/components/games/skull-king/entry/hold-to-confirm-erase"
import { loadGameConfig } from "@/lib/games/skull-king/game-config-storage"
import {
  getSkullKingEntryState,
  type SkullKingEntryState,
} from "@/lib/games/skull-king/skull-king-entry-state"
import { loadRoundData } from "@/lib/games/skull-king/round-score/round-data-storage"
import { useSkullKingStore } from "@/lib/games/skull-king/skull-king-store"
import type { SkullKingGameConfig } from "@/lib/games/skull-king/skull-king-game-config"
import { wipeSkullKingLocalGame } from "@/lib/games/skull-king/wipe-skull-king-local-game"

function syncSetupStoreFromStorage() {
  const saved = loadGameConfig()
  if (saved) useSkullKingStore.getState().hydrateFromGameConfig(saved)
}

const TOAST_HOLD_HINT = "Press and hold"

const TOAST_MS = 4500

const crewBlockClasses = "flex w-full flex-col gap-2"

const crewHeadRowClasses =
  "flex w-full flex-row items-baseline justify-between gap-x-4 gap-y-1"

const crewLabelClass =
  "font-label text-[0.65rem] tracking-[0.12em] text-muted-foreground uppercase shrink-0"

function playerCountPhrase(
  namedCount: number,
  fallbackCount: number | undefined
): string {
  if (namedCount > 0) {
    return `${namedCount} ${namedCount === 1 ? "player" : "players"}`
  }
  if (fallbackCount != null && fallbackCount > 0) {
    return `${fallbackCount} ${fallbackCount === 1 ? "player" : "players"}`
  }
  return "—"
}

type View =
  | { status: "loading" }
  | { status: "ready"; entry: Exclude<SkullKingEntryState, { kind: "fresh" }> }

function SessionSummary({
  entry,
  config,
}: {
  entry: Exclude<SkullKingEntryState, { kind: "fresh" }>
  config: SkullKingGameConfig | null
}) {
  if (entry.kind === "ongoing") {
    const persisted = loadRoundData()
    const crewCount = persisted?.playerCount ?? "—"
    const roundValue = `${entry.currentRoundIndex + 1} of ${entry.roundCount}`
    const crewPlayers = config?.players ?? []
    const namedCrew = crewPlayers.filter((n) => n.trim() !== "")
    const countPhrase = playerCountPhrase(
      namedCrew.length,
      typeof crewCount === "number" ? crewCount : undefined
    )

    return (
      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="border-b border-border/70 px-5 py-4 sm:px-6">
          <CardTitle className="text-base">Voyage in progress</CardTitle>
          <CardDescription>Scoring session saved in this browser</CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-4 sm:px-6">
          <dl className="flex flex-col gap-4 text-sm">
            <div className={crewBlockClasses}>
              <div className={crewHeadRowClasses}>
                <dt className={crewLabelClass}>Crew</dt>
                <dd className="m-0 font-headline font-semibold text-foreground tabular-nums">
                  {countPhrase}
                </dd>
              </div>
              <dd className="m-0 min-w-0 text-left">
                <CrewList variant="sessionCard" players={crewPlayers} />
              </dd>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-3">
              <dt className="font-label text-[0.65rem] tracking-[0.12em] text-muted-foreground uppercase">
                Current round
              </dt>
              <dd className="min-w-0 text-right font-headline font-semibold text-foreground tabular-nums">
                {roundValue}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    )
  }

  const c = config
  if (!c) {
    return (
      <Card className="py-4 shadow-sm">
        <CardHeader className="px-5 sm:px-6">
          <CardTitle className="text-base">Saved game</CardTitle>
          <CardDescription>Configuration is stored on this device.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const roundsCount = c.roundsSchema.length
  const namedCrew = c.players.filter((n) => n.trim() !== "")
  const countPhrase = playerCountPhrase(namedCrew.length, undefined)

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b border-border/70 px-5 py-4 sm:px-6">
        <CardTitle className="text-base">Game ready</CardTitle>
        <CardDescription>Crew and voyage chart saved — not started yet</CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-4 sm:px-6">
        <dl className="flex flex-col gap-4 text-sm">
          <div className={crewBlockClasses}>
            <div className={crewHeadRowClasses}>
              <dt className={crewLabelClass}>Crew</dt>
              <dd className="m-0 font-headline font-semibold text-foreground tabular-nums">
                {countPhrase}
              </dd>
            </div>
            <dd className="m-0 min-w-0 text-left">
              <CrewList variant="sessionCard" players={c.players} />
            </dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-3">
            <dt className="font-label text-[0.65rem] tracking-[0.12em] text-muted-foreground uppercase">
              Voyage length
            </dt>
            <dd className="text-right font-headline font-semibold text-foreground tabular-nums">
              {roundsCount} hands
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

export function SkullKingEntryClient() {
  const router = useRouter()
  const [view, setView] = React.useState<View>({ status: "loading" })
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    const entry = getSkullKingEntryState()
    if (entry.kind === "fresh") {
      router.replace("/games/skull-king/calculator/setup")
      return
    }
    setView({ status: "ready", entry })
  }, [router])

  React.useEffect(() => {
    if (!toastMessage) return
    const id = window.setTimeout(() => setToastMessage(null), TOAST_MS)
    return () => window.clearTimeout(id)
  }, [toastMessage])

  const onConfirmStartFresh = () => {
    wipeSkullKingLocalGame()
    router.replace("/games/skull-king/calculator/setup")
  }

  if (view.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const { entry } = view
  const isOngoing = entry.kind === "ongoing"
  const config = loadGameConfig()
  const persistedRound = isOngoing ? loadRoundData() : null

  const primaryHref = isOngoing ? "/games/skull-king/calculator/round" : "/games/skull-king/calculator/setup?step=4"
  const primaryTitle = isOngoing ? "Continue voyage" : "Review and start"
  const primaryAria = isOngoing
    ? `${primaryTitle}. Round ${entry.currentRoundIndex + 1} of ${entry.roundCount}${
        persistedRound != null ? `, ${persistedRound.playerCount} players` : ""
      }.`
    : `${primaryTitle}. Saved crew and voyage on this device.`

  const headline = isOngoing ? "Continue your voyage" : "Ready to sail"

  const confirmEraseAria = isOngoing
    ? "Erase all rounds and scores for this voyage on this device. Cannot be undone."
    : "Erase saved crew, voyage chart, artifacts, and any round data on this device. Cannot be undone."

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-8 text-left">
      <EphemeralToast message={toastMessage} variant="warning" />

      <header className="max-w-prose">
        <h2 className="font-headline text-3xl leading-tight font-semibold tracking-tight text-primary sm:text-4xl">
          {headline}
        </h2>
      </header>

      <SessionSummary entry={entry} config={config} />

      <div className="flex w-full flex-col gap-4">
        <Button variant="branded" size="cta" className="w-full" asChild>
          <Link
            href={primaryHref}
            aria-label={primaryAria}
            onClick={isOngoing ? undefined : syncSetupStoreFromStorage}
          >
            {primaryTitle}
          </Link>
        </Button>

        <HoldToConfirmErase
          variant="caution"
          size="lg"
          className="shrink-0"
          labelIdle="Start fresh"
          ariaDescription={confirmEraseAria}
          onConfirm={onConfirmStartFresh}
          onShortTapHint={() => setToastMessage(TOAST_HOLD_HINT)}
        />
      </div>
    </div>
  )
}
