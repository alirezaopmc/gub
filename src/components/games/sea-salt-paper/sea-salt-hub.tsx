import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@manovaspace/ui";
import { BookOpen, Calculator, Play, Waves } from "lucide-react";
import Link from "next/link";

export function SeaSaltHub() {
  return (
    <div className="flex flex-col gap-8 px-4 py-8 max-w-4xl mx-auto w-full">
      {/* Hero Header */}
      <div className="flex flex-col gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <Badge
            variant="outline"
            className="border-sky-500/40 text-sky-400 bg-sky-500/10"
          >
            Origami Card Game
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            2–4 Players
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            ~30 Min
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            Bruno Cathala
          </Badge>
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Sea Salt & Paper
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
          An ocean of folded paper where every hand is a tense decision. Play
          duo pairs for instant abilities, assemble shells, octopuses, and
          penguins, leverage lighthouse and fish multipliers, or dare to declare
          Last Chance!
        </p>
      </div>

      {/* Main Tool Launchers */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Tableside Scorer */}
        <Card className="flex flex-col justify-between border-sky-500/30 bg-card/60 backdrop-blur-sm hover:border-sky-500/60 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Waves className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Round Companion</CardTitle>
                <CardDescription>
                  Multi-player tableside score keeper
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track 2 to 4 players, automatic win thresholds (30/35/40 pts),
              Stop vs Last Chance bets, color bonuses, and 4-Mermaid instant
              wins.
            </p>
            <Button
              asChild
              className="w-full font-bold bg-sky-500 text-black hover:bg-sky-400"
            >
              <Link href="/games/sea-salt-paper/round">
                <Play className="size-4 mr-2" /> Open Companion
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Hand Calculator */}
        <Card className="flex flex-col justify-between border-border hover:border-sky-500/40 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                <Calculator className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Hand Calculator</CardTitle>
                <CardDescription>
                  Instant card combination and point counter
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Step through your cards (duos, shells, octopuses, multipliers,
              mermaids) to calculate your exact hand value and check if you hit
              the 7-point declaration threshold.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/games/sea-salt-paper/calculator">
                <Calculator className="size-4 mr-2" /> Open Calculator
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Rules & Reference Banner */}
      <Card className="p-6 border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 shrink-0">
            <BookOpen className="size-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm sm:text-base">
              Rules & Card Reference
            </h3>
            <p className="text-xs text-muted-foreground">
              Official scoring tables, duo powers, and Last Chance betting
              mechanics.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/games/sea-salt-paper/docs">Read Rules</Link>
        </Button>
      </Card>
    </div>
  );
}
