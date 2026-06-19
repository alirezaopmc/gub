"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cardImagePath, CARD_BACK_IMAGE } from "@/lib/games/skull-king/engine/cards"
import { createCard } from "@/lib/games/skull-king/engine/cards"
import type { Card as SkCard } from "@/lib/games/skull-king/engine/types"
import type { PublicMatchView } from "@/lib/games/skull-king/session/match-store"
import { PlayRoundHistory } from "@/components/games/skull-king/play/play-round-history"
import { PlayScoringPhase } from "@/components/games/skull-king/play/play-scoring-phase"
import { PlayVoyageStatsDialog } from "@/components/games/skull-king/play/play-voyage-stats-dialog"
import { RoundScoreBodyMotion } from "@/components/games/skull-king/round-score/round-body-motion"
import styles from "@/components/games/skull-king/play/styles/play.module.css"
import { playCardSound } from "@/lib/games/skull-king/play/sounds"

const SESSION_KEY = "skull-king:play-session"

export type PlaySession = { code: string; playerId: string }

export function loadPlaySession(): PlaySession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlaySession
  } catch {
    return null
  }
}

export function savePlaySession(session: PlaySession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function parseCardId(id: string): SkCard {
  if (id === "tigress") return createCard({ kind: "tigress" })
  if (id === "skull_king") return createCard({ kind: "skull_king" })
  if (id === "kraken") return createCard({ kind: "kraken" })
  if (id === "whale") return createCard({ kind: "whale" })
  if (id.startsWith("green:")) return createCard({ kind: "suited", suit: "green", rank: Number(id.split(":")[1]) })
  if (id.startsWith("yellow:")) return createCard({ kind: "suited", suit: "yellow", rank: Number(id.split(":")[1]) })
  if (id.startsWith("purple:")) return createCard({ kind: "suited", suit: "purple", rank: Number(id.split(":")[1]) })
  if (id.startsWith("black:")) return createCard({ kind: "suited", suit: "black", rank: Number(id.split(":")[1]) })
  if (id.startsWith("escape:")) return createCard({ kind: "escape", index: Number(id.split(":")[1]) })
  if (id.startsWith("pirate:")) return createCard({ kind: "pirate", pirate: id.split(":")[1] as "rosie" })
  if (id.startsWith("mermaid:")) return createCard({ kind: "mermaid", mermaid: id.split(":")[1] as "alyra" })
  if (id.startsWith("loot:")) return createCard({ kind: "loot", index: Number(id.split(":")[1]) })
  return createCard({ kind: "escape", index: 0 })
}

export function PlayingCard({
  cardId,
  faceDown,
  onClick,
  small,
  playable,
}: {
  cardId?: string
  faceDown?: boolean
  onClick?: () => void
  small?: boolean
  playable?: boolean
}) {
  const src = faceDown || !cardId ? CARD_BACK_IMAGE : cardImagePath(parseCardId(cardId))
  return (
    <button
      type="button"
      className={`${styles.card} ${small ? styles.cardSmall : ""} ${onClick ? styles.cardClickable : ""} ${playable ? styles.cardPlayable : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <Image src={src} alt="" width={120} height={168} className={styles.cardImage} unoptimized />
    </button>
  )
}

export function PlayHubClient() {
  const router = useRouter()
  const [hostName, setHostName] = React.useState("")
  const [joinCode, setJoinCode] = React.useState("")
  const [joinName, setJoinName] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const createMatch = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/games/skull-king/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: hostName || "Host", playerCount: 3 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "failed")
      savePlaySession({ code: data.code, playerId: data.playerId })
      router.push(`/games/skull-king/play/m/${data.code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed")
    } finally {
      setLoading(false)
    }
  }

  const joinMatch = async () => {
    setLoading(true)
    setError(null)
    try {
      const code = joinCode.trim().toUpperCase()
      const res = await fetch(`/api/games/skull-king/matches/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: joinName || "Sailor" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "failed")
      savePlaySession({ code, playerId: data.playerId })
      router.push(`/games/skull-king/play/m/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="font-headline text-3xl font-semibold text-primary">Play live</h2>
        <p className="mt-2 text-muted-foreground">Create a match or join with a 2-letter code.</p>
      </header>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Host new match</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />
          <Button variant="branded" disabled={loading} onClick={createMatch}>
            Create match
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Join match</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm uppercase"
            placeholder="Code (e.g. AB)"
            maxLength={2}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/[^a-zA-Z]/g, ""))}
          />
          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Your name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
          />
          <Button variant="outline" disabled={loading || joinCode.length !== 2} onClick={joinMatch}>
            Join
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function MatchTableClient({ code }: { code: string }) {
  const [view, setView] = React.useState<PublicMatchView | null>(null)
  const [playerId, setPlayerId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const session = loadPlaySession()
    if (!session || session.code.toUpperCase() !== code.toUpperCase()) {
      setError("Session missing — rejoin from Play hub.")
      return
    }
    setPlayerId(session.playerId)
  }, [code])

  const fetchView = React.useCallback(async () => {
    if (!playerId) return
    const res = await fetch(`/api/games/skull-king/matches/${code}?playerId=${playerId}`)
    const data = await res.json()
    if (res.ok) setView(data.view)
  }, [code, playerId])

  React.useEffect(() => {
    if (!playerId) return
    void fetchView()
    const id = window.setInterval(() => void fetchView(), 1500)
    return () => window.clearInterval(id)
  }, [playerId, fetchView])

  const [actionError, setActionError] = React.useState<string | null>(null)

  const dispatch = async (action: Record<string, unknown>) => {
    if (!playerId) return
    setActionError(null)
    const res = await fetch(`/api/games/skull-king/matches/${code}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, action }),
    })
    const data = await res.json()
    if (res.ok) setView(data.view)
    else setActionError(formatActionError(data.error))
  }

  if (error && !view) {
    return <p className="text-destructive">{error}</p>
  }
  if (!view || !playerId) {
    return <p className="text-muted-foreground">Loading match…</p>
  }

  return <MatchTableInner view={view} dispatch={dispatch} actionError={actionError} />
}

function formatActionError(code: string): string {
  switch (code) {
    case "not_your_turn":
      return "Not your turn."
    case "illegal_card":
      return "That card cannot be played now."
    case "invalid_bid":
      return "Invalid bid."
    default:
      return code.replaceAll("_", " ")
  }
}

function playerName(view: PublicMatchView, seat: number): string {
  return view.players.find((p) => p.seatIndex === seat)?.displayName ?? `Player ${seat + 1}`
}

function MatchTableInner({
  view,
  dispatch,
  actionError,
}: {
  view: PublicMatchView
  dispatch: (action: Record<string, unknown>) => Promise<void>
  actionError: string | null
}) {
  const [statsOpen, setStatsOpen] = React.useState(false)
  const gameOverOpenedRef = React.useRef(false)

  React.useEffect(() => {
    if (view.phase === "game_over" && !gameOverOpenedRef.current) {
      gameOverOpenedRef.current = true
      setStatsOpen(true)
    }
  }, [view.phase])

  const round = view.round
  const myBid = round ? round.bids[view.viewerSeat]?.bid ?? null : null
  const bidTarget = round?.bids.length ?? view.players.length
  const bidsIn = round ? round.bids.filter((b) => b.bid !== null).length : 0
  const allBidsIn = round?.bids.every((b) => b.bid !== null) ?? false
  const showHand =
    round != null &&
    (round.phase === "bidding" || round.phase === "playing" || round.phase === "ability")
  const expectedTurnSeat = round?.expectedTurnSeat ?? -1
  const canPlay =
    round?.phase === "playing" &&
    !round.pendingAbility &&
    expectedTurnSeat === view.viewerSeat

  const headerScores =
    round?.phase === "scoring" ? view.provisionalScores : view.cumulativeScores
  const scoringPhase = round?.phase === "scoring"

  const submitBid = (bid: number) => void dispatch({ type: "submit_bid", bid })

  const playCard = (cardId: string) => {
    playCardSound()
    void dispatch({ type: "play_card", cardId, seed: Date.now() })
  }

  let phaseMessage: string | null = null
  if (round?.phase === "bidding") {
    if (!allBidsIn) {
      phaseMessage =
        myBid !== null
          ? `Bid ${myBid} — waiting for ${bidTarget - bidsIn} more (${bidsIn}/${bidTarget} ready)`
          : `Choose your bid (${bidsIn}/${bidTarget} ready)`
    }
  } else if (round?.phase === "playing") {
    phaseMessage = "All bids in — tricks begin!"
    if (canPlay) {
      phaseMessage = "Your turn — tap a card in your hand to play"
    } else if (expectedTurnSeat >= 0) {
      phaseMessage = `Waiting for ${playerName(view, expectedTurnSeat)}…`
    }
  } else if (round?.phase === "ability") {
    phaseMessage = "Pirate ability — resolve before play continues"
  } else if (round?.phase === "scoring") {
    phaseMessage = view.viewerIsHost
      ? `Round ${round.roundIndex + 1} complete — review scores, then continue`
      : `Round ${round.roundIndex + 1} complete — review results`
  }

  const activeSeat =
    round?.phase === "playing" && expectedTurnSeat >= 0 ? expectedTurnSeat : -1

  const roundMotionKey = round?.roundIndex ?? view.roundHistory.length

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-primary">Match {view.code}</h2>
          <p className="text-sm text-muted-foreground capitalize">{view.phase.replace("_", " ")}</p>
        </div>
        <div className="text-right text-sm tabular-nums">
          {view.players.map((p, i) => (
            <div
              key={p.seatIndex}
              className={
                activeSeat === p.seatIndex
                  ? styles.activePlayer
                  : scoringPhase
                    ? styles.provisionalScore
                    : undefined
              }
            >
              {p.displayName}: {headerScores[i]}
              {activeSeat === p.seatIndex ? " · turn" : ""}
              {scoringPhase && round?.roundScores?.[i] != null ? (
                <span className={styles.scoreDelta}>
                  {" "}
                  ({round.roundScores[i]! >= 0 ? "+" : ""}
                  {round.roundScores[i]})
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </header>

      {view.phase === "lobby" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Players ({view.players.length}) — starts when at least 3 joined
          </p>
          <ul className="text-sm">
            {view.players.map((p) => (
              <li key={p.seatIndex}>
                {p.displayName} {p.isHost ? "(host)" : ""}
              </li>
            ))}
          </ul>
          {view.viewerIsHost ? (
            <Button
              variant="branded"
              disabled={view.players.length < 3}
              onClick={() => void dispatch({ type: "start_match", seed: Date.now() })}
            >
              Start voyage
            </Button>
          ) : null}
        </div>
      ) : null}

      <RoundScoreBodyMotion roundIndex={roundMotionKey}>
        {round && round.phase !== "scoring" ? (
          <div className="text-sm text-muted-foreground">
            <p>
              Round {round.roundIndex + 1} of {round.roundsTotal} · {round.handSize} card
              {round.handSize === 1 ? "" : "s"} each
            </p>
            <p>
              Dealer: {playerName(view, round.dealerIndex)} · Leads:{" "}
              {playerName(view, round.leaderIndex)}
            </p>
          </div>
        ) : null}

        {actionError ? (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {actionError}
          </p>
        ) : null}

        {phaseMessage ? (
          <p
            className={`rounded-lg border px-4 py-3 text-sm ${canPlay ? styles.statusYourTurn : styles.statusBanner}`}
            role="status"
          >
            {phaseMessage}
          </p>
        ) : null}

        {view.phase === "in_progress" && !round && view.viewerIsHost ? (
          <Button
            variant="outline"
            onClick={() => void dispatch({ type: "start_round", seed: Date.now() })}
          >
            Deal next round
          </Button>
        ) : null}

        {round?.phase === "bidding" && !allBidsIn ? (
          <div className="flex flex-col gap-3">
            <p className="font-label text-xs tracking-wide text-muted-foreground uppercase">
              Your bid
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: round.handSize + 1 }, (_, bid) => (
                <Button
                  key={bid}
                  size="sm"
                  variant={myBid === bid ? "branded" : "outline"}
                  onClick={() => submitBid(bid)}
                >
                  {bid}
                </Button>
              ))}
            </div>
            {myBid !== null ? (
              <p className="text-xs text-muted-foreground">
                Tap another number to change your bid before everyone is ready.
              </p>
            ) : null}
          </div>
        ) : null}

        {round?.phase === "playing" ? (
          <div className="flex flex-col gap-2">
            <p className="font-label text-xs tracking-wide text-muted-foreground uppercase">
              Current trick
            </p>
            <div
              className={`${styles.trickArea} flex min-h-[6rem] flex-wrap items-center justify-center gap-2`}
            >
              {round.currentTrick.length > 0 ? (
                round.currentTrick.map((p) => (
                  <div
                    key={`${p.seatIndex}-${p.cardId}`}
                    className="flex flex-col items-center gap-1"
                  >
                    <PlayingCard cardId={p.cardId} small />
                    <span className="text-[0.65rem] text-muted-foreground">
                      {playerName(view, p.seatIndex)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No cards played yet</p>
              )}
            </div>
          </div>
        ) : null}

        {showHand ? (
          <div className="flex flex-col gap-2">
            <p className="font-label text-xs tracking-wide text-muted-foreground uppercase">
              Your hand
            </p>
            <div className={`${styles.handRow} flex flex-wrap justify-center gap-2`}>
              {round!.hand.length > 0 ? (
                round!.hand.map((c) => (
                  <PlayingCard
                    key={c.id}
                    cardId={c.id}
                    playable={canPlay}
                    onClick={canPlay ? () => playCard(c.id) : undefined}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No cards in hand.</p>
              )}
            </div>
          </div>
        ) : null}

        {round?.phase === "scoring" ? (
          <PlayScoringPhase
            view={view}
            dispatch={dispatch}
            onOpenStandings={() => setStatsOpen(true)}
          />
        ) : null}
      </RoundScoreBodyMotion>

      {view.phase !== "lobby" ? (
        <div className="flex items-center justify-between gap-2">
          <PlayRoundHistory view={view} />
          <Button type="button" variant="ghost" size="sm" onClick={() => setStatsOpen(true)}>
            Standings
          </Button>
        </div>
      ) : null}

      {view.phase === "game_over" && view.winners ? (
        <p className="font-headline text-lg text-primary">
          {view.winners.length > 1 ? "Shared victory!" : "Winner!"}{" "}
          {view.winners.map((i) => view.players[i]?.displayName).join(", ")}
        </p>
      ) : null}

      <PlayVoyageStatsDialog view={view} open={statsOpen} onOpenChange={setStatsOpen} />
    </div>
  )
}
