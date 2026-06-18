import type { Metadata } from "next"

import { SkullKingEntryClient } from "@/app/games/skull-king/skull-king-entry-client"

export const metadata: Metadata = {
  title: "Skull King · GUB",
  description: "Continue a voyage or start a new crew.",
}

export default function SkullKingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background px-6 py-setup-page-y text-foreground">
      <main className="mx-auto flex w-full max-w-2xl flex-col text-left">
        <h1 className="sr-only">Skull King — continue or start</h1>
        <SkullKingEntryClient />
      </main>
    </div>
  )
}
