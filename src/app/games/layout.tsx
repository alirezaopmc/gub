import { GameTopNav } from "@/components/games/game-top-nav"

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground [--docs-rail-sticky-top:calc(var(--game-top-nav-height)+3.25rem)] [--game-top-nav-height:3.25rem]">
      <GameTopNav />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
