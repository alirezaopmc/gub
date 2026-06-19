import type { Metadata } from "next"

import { SkullKingHubClient } from "@/components/games/skull-king/hub/skull-king-hub-client"

export const metadata: Metadata = {
  title: "Skull King · GUB",
  description: "Play live, use the score calculator, or read the rules.",
}

export default function SkullKingHubPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background px-6 py-16 text-foreground">
      <main className="mx-auto flex w-full max-w-2xl flex-col">
        <h1 className="sr-only">Skull King hub</h1>
        <SkullKingHubClient />
      </main>
    </div>
  )
}
