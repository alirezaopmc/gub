import type { Metadata } from "next"

import { PlayHubClient } from "@/components/games/skull-king/play/play-clients"

export const metadata: Metadata = {
  title: "Skull King · Play · GUB",
  description: "Create or join a live Skull King match.",
}

export default function PlayHubPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background px-6 py-16 text-foreground">
      <main className="mx-auto w-full max-w-lg">
        <h1 className="sr-only">Skull King play</h1>
        <PlayHubClient />
      </main>
    </div>
  )
}
