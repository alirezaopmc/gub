"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const tiles = [
  {
    href: "/games/skull-king/play",
    title: "Play",
    description: "Live multiplayer matches — join with a 2-letter code.",
  },
  {
    href: "/games/skull-king/calculator",
    title: "Score Calculator",
    description: "Track bids, tricks, and bonuses on one device.",
  },
  {
    href: "/games/skull-king/docs",
    title: "Rules & Docs",
    description: "Full Skull King rules, scoring, and app notes.",
  },
] as const

export function SkullKingHubClient() {
  return (
    <div className="flex w-full flex-col gap-8">
      <header className="max-w-prose">
        <h2 className="font-headline text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
          Skull King
        </h2>
        <p className="mt-2 text-muted-foreground">
          Trick-taking on the high seas — play live or score a tableside voyage.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((tile) => (
          <Card key={tile.href} className="gap-0 overflow-hidden py-0 shadow-sm">
            <CardHeader className="border-b border-border/70 px-5 py-4">
              <CardTitle className="text-base">{tile.title}</CardTitle>
              <CardDescription>{tile.description}</CardDescription>
            </CardHeader>
            <CardContent className="px-5 py-4">
              <Button variant="branded" className="w-full" asChild>
                <Link href={tile.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
