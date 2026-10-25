import { Compass, Sparkles } from "lucide-react";
import { GameHubCard } from "@/components/games/game-hub-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const games = [
  {
    href: "/games/skull-king",
    title: "Skull King",
    description:
      "Trick-taking pirate card game — play live multiplayer, track bids & scoring tableside, or check in-app rules.",
    imageSrc: "/games/skull-king/cover.svg",
    imageAlt: "Skull King game cover art",
    badge: "Active voyage",
    playerCount: "2–8 Players",
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background px-6 py-12 text-foreground sm:py-16">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10">
        <header className="flex flex-col gap-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 self-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:self-start">
            <Compass className="size-3.5" />
            <span>Tabletop Companion Hub</span>
          </div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Game{" "}
            <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
              hub
            </span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Pick a game to start a match, track tableside scores, or browse
            interactive rules. Built for smooth game nights with friends.
          </p>
        </header>

        <section className="w-full" aria-labelledby="games-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="games-heading"
              className="font-label text-xs font-bold tracking-wider text-muted-foreground uppercase"
            >
              Featured Titles
            </h2>
            <span className="text-xs text-muted-foreground">
              1 title available
            </span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {games.map((game) => (
              <GameHubCard key={game.href} {...game} />
            ))}

            {/* Upcoming Games Friendly Tile */}
            <Card className="flex flex-col justify-between border-dashed border-border/80 bg-muted/20 p-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/30">
              <CardHeader className="p-0">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                  More voyages ahead
                </CardTitle>
                <CardDescription className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  New card and board game companions are sailing in soon.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-6">
                <span className="inline-block rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  In active development
                </span>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
