import type { Metadata } from "next"
import { Suspense } from "react"

import { SkullKingSetupView } from "@/components/games/skull-king/setup"

export const metadata: Metadata = {
  title: "Skull King · Setup · GUB",
  description: "Configure crew, voyage chart, artifacts, and confirm before play.",
}

function SkullKingSetupFallback() {
  return <div className="min-h-[min(40vh,24rem)] w-full shrink-0" aria-hidden />
}

export default function SkullKingSetupPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background px-6 pt-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-foreground">
      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col text-left">
        <h1 className="sr-only">Skull King setup</h1>
        <Suspense fallback={<SkullKingSetupFallback />}>
          <SkullKingSetupView />
        </Suspense>
      </main>
    </div>
  )
}
