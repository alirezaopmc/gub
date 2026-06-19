import { NextResponse } from "next/server"

import { dispatchAction } from "@/lib/games/skull-king/session/match-store"
import { normalizeMatchCode } from "@/lib/games/skull-king/session/match-code"

type RouteCtx = { params: Promise<{ code: string }> }

export async function POST(request: Request, ctx: RouteCtx) {
  const { code } = await ctx.params
  const body = (await request.json()) as {
    playerId?: string
    action?: Record<string, unknown>
  }
  if (!body.playerId || !body.action?.type) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const result = dispatchAction(
    normalizeMatchCode(code),
    body.playerId,
    body.action as Parameters<typeof dispatchAction>[2]
  )

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ view: result.view })
}
