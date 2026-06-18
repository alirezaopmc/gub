import type { Metadata } from "next"

import { SkullKingStartClient } from "@/app/games/skull-king/start/skull-king-start-client"

export const metadata: Metadata = {
  title: "Skull King · Start · GUB",
  description: "Confirm crew and begin the voyage.",
}

export default function SkullKingStartPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background px-6 pt-8 pb-[max(0.25rem,env(safe-area-inset-bottom))] text-foreground sm:pt-10">
      <main className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col text-left">
        <h1 className="sr-only">Skull King — start</h1>
        <SkullKingStartClient />
      </main>
    </div>
  )
}
