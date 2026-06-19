import { NextResponse } from "next/server"

import { createMatch } from "@/lib/games/skull-king/session/match-store"

export async function POST(request: Request) {
  const body = (await request.json()) as { hostName?: string; playerCount?: number }
  const hostName = body.hostName?.trim() || "Host"
  const playerCount = body.playerCount ?? 4
  const match = createMatch(hostName, playerCount)
  const host = match.players[0]!
  return NextResponse.json({
    code: match.state.code,
    playerId: host.id,
    view: {
      code: match.state.code,
      phase: match.state.phase,
      version: match.state.version,
    },
  })
}
