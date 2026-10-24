import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@manovaspace/ui";
import { BookOpen, Calculator, Play, Users } from "lucide-react";
import Link from "next/link";

export function ScoutHub() {
  return (
    <div className="flex flex-col gap-8 px-4 py-8 max-w-4xl mx-auto w-full">
      {/* Hero Header */}
      <div className="flex flex-col gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-400 bg-amber-500/10"
          >
            Oink Games
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            3–5 Players
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            ~20 Min
          </Badge>
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Scout
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
          A fast-paced circus card climbing game where card order in your hand
          is permanently fixed. Scout cards from the table into your hand,
          assemble powerful sets or runs, and show off your troupe!
        </p>
      </div>

      {/* Main Tool Launchers */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Tableside Scorer */}
        <Card className="flex flex-col justify-between border-amber-500/30 bg-card/60 backdrop-blur-sm hover:border-amber-500/60 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Users className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Round Companion</CardTitle>
                <CardDescription>
                  Multi-player tableside score tracker
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track collected cards, scout chips, hand penalties, and running
              totals across multiple rounds during game night.
            </p>
            <Button
              asChild
              className="w-full font-bold bg-amber-500 text-black hover:bg-amber-400"
            >
              <Link href="/games/scout/round">
                <Play className="size-4 mr-2" /> Open Companion
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Calculator */}
        <Card className="flex flex-col justify-between hover:border-foreground/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Calculator className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Quick Calculator</CardTitle>
                <CardDescription>
                  Instant single-player score counter
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calculate points for a single player instantly with rapid one-tap
              stepper controls.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/games/scout/calculator">
                <Calculator className="size-4 mr-2" /> Calculate Score
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mechanics Breakdown */}
      <div className="flex flex-col gap-4">
        <h2 className="font-label text-xs uppercase tracking-wider text-muted-foreground">
          Core Mechanics
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4 bg-muted/20 border-border">
            <h3 className="font-bold text-sm text-foreground mb-1">1. Show</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Play adjacent cards (Single, Set, or Run) that strictly beat the
              active table combination. Collect the beaten cards for +1 pt each!
            </p>
          </Card>
          <Card className="p-4 bg-muted/20 border-border">
            <h3 className="font-bold text-sm text-foreground mb-1">2. Scout</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Can't beat the table? Take either the leftmost or rightmost card
              into any slot in your hand. The set owner earns a +1 Scout Chip.
            </p>
          </Card>
          <Card className="p-4 bg-muted/20 border-border">
            <h3 className="font-bold text-sm text-foreground mb-1">
              3. Scout &amp; Show
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Once per round, spend your token to Scout a card and immediately
              Show in the exact same turn!
            </p>
          </Card>
        </div>
      </div>

      {/* Rules link footer */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/40">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Need a refresher on combination rankings?
          </span>
        </div>
        <Button asChild variant="link" size="sm" className="text-amber-400">
          <Link href="/games/scout/docs">Read Rules &rarr;</Link>
        </Button>
      </div>
    </div>
  );
}
