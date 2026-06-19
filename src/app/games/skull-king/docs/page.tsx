import type { Metadata } from "next"

import { SkullKingDocsView } from "@/components/games/skull-king/docs/skull-king-docs-view"

export const metadata: Metadata = {
  title: "Skull King · Rules · GUB",
  description: "Skull King rules, scoring, and how to use this app.",
}

export default function SkullKingDocsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background px-6 py-12 text-foreground">
      <main className="mx-auto w-full max-w-3xl">
        <SkullKingDocsView />
      </main>
    </div>
  )
}
