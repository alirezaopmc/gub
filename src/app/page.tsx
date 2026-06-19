import { GameHubCard } from "@/components/games/game-hub-card"

const games = [
  {
    href: "/games/skull-king",
    title: "Skull King",
    description: "Trick-taking pirate card game — play live, score, or read rules.",
    imageSrc: "/games/skull-king/cover.png",
    imageAlt: "Skull King game cover art",
  },
] as const

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background px-6 py-16 text-foreground">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12">
        <div className="flex flex-col gap-6 text-center sm:text-left">
          <h1 className="font-headline max-w-xs text-3xl font-semibold leading-10 tracking-tight text-primary">
            Game hub
          </h1>
          <p className="max-w-md text-lg leading-8 text-muted-foreground">
            Pick a game to open its table. More titles will show up here as they ship.
          </p>
        </div>
        <section className="w-full" aria-labelledby="games-heading">
          <h2
            id="games-heading"
            className="font-label mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            Games
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {games.map((game) => (
              <GameHubCard key={game.href} {...game} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
