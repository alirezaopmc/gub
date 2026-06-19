import type { Metadata } from "next"

import { RoundVoyageView } from "@/components/games/skull-king/round-score/round-voyage-view"

export const metadata: Metadata = {
  title: "Skull King · Round · GUB",
  description: "Host the current deal: events, bid or won, and finish the round.",
}

export default function SkullKingCalculatorRoundPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
      <RoundVoyageView />
    </div>
  )
}
