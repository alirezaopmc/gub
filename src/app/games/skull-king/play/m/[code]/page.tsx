import type { Metadata } from "next"

import { MatchTableClient } from "@/components/games/skull-king/play/play-clients"

type PageProps = { params: Promise<{ code: string }> }

export const metadata: Metadata = {
  title: "Skull King · Match · GUB",
}

export default async function MatchPage({ params }: PageProps) {
  const { code } = await params
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background px-6 py-8 text-foreground">
      <main className="mx-auto w-full max-w-3xl">
        <MatchTableClient code={code} />
      </main>
    </div>
  )
}
