import { NextResponse } from "next/server"

import { getPublicView, joinMatch } from "@/lib/games/skull-king/session/match-store"
import { isValidMatchCode, normalizeMatchCode } from "@/lib/games/skull-king/session/match-code"

type RouteCtx = { params: Promise<{ code: string }> }

export async function GET(request: Request, ctx: RouteCtx) {
  const { code } = await ctx.params
  const playerId = new URL(request.url).searchParams.get("playerId")
  if (!playerId) return NextResponse.json({ error: "missing_player_id" }, { status: 400 })
  const view = getPublicView(code, playerId)
  if (!view) return NextResponse.json({ error: "not_found" }, { status: 404 })
  return NextResponse.json({ view })
}

export async function POST(request: Request, ctx: RouteCtx) {
  const { code } = await ctx.params
  if (!isValidMatchCode(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 })
  }
  const body = (await request.json()) as { displayName?: string }
  const displayName = body.displayName?.trim() || "Sailor"
  const result = joinMatch(normalizeMatchCode(code), displayName)
  if (!result) return NextResponse.json({ error: "cannot_join" }, { status: 400 })
  const view = getPublicView(result.match.state.code, result.playerId)
  return NextResponse.json({ playerId: result.playerId, view })
}
