import { Badge, Button, Card } from "@manovaspace/ui";
import { ArrowLeft, Award, Sparkles, Waves, Zap } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Sea Salt & Paper Rules & Reference | GUB",
  description:
    "Official Sea Salt & Paper card game rules, duo powers, set collections, and scoring guide.",
};

export default function SeaSaltDocsPage() {
  return (
    <div className="flex flex-col gap-8 px-4 py-8 max-w-3xl mx-auto w-full">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/games/sea-salt-paper">
            <ArrowLeft className="size-4" /> Hub
          </Link>
        </Button>
        <Badge variant="outline" className="border-sky-500/40 text-sky-400">
          Rules Reference
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-headline text-3xl font-extrabold text-foreground">
          How to Play Sea Salt & Paper
        </h1>
        <p className="text-muted-foreground text-sm">
          An origami card game by Bruno Cathala and Théo Rivière for 2–4
          players.
        </p>
      </div>

      {/* Core Flow */}
      <Card className="border-sky-500/30 bg-sky-500/5 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
            <Waves className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-base text-foreground">
              Turn Structure
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              On your turn, choose <strong>one</strong>:
              <br />• Draw 2 cards from the draw deck, keep 1, discard 1 to
              either discard pile.
              <br />• Take the top card from either of the two open discard
              piles.
              <br />
              After drawing, you may optionally play any number of{" "}
              <strong>Duo pairs</strong> from your hand to the table to activate
              their special powers!
            </p>
          </div>
        </div>
      </Card>

      {/* Duo Powers */}
      <div className="flex flex-col gap-4">
        <h2 className="font-headline text-xl font-bold text-foreground flex items-center gap-2">
          <Zap className="size-5 text-amber-400" /> Duo Pairs (1 pt each +
          power)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4 bg-card/60 flex flex-col gap-1">
            <span className="font-bold text-sm text-sky-400">2 Crabs</span>
            <p className="text-xs text-muted-foreground">
              Look through either discard pile and pick any 1 card into your
              hand without shuffling.
            </p>
          </Card>
          <Card className="p-4 bg-card/60 flex flex-col gap-1">
            <span className="font-bold text-sm text-sky-400">2 Boats</span>
            <p className="text-xs text-muted-foreground">
              Immediately take another turn (draw and optionally play duos).
            </p>
          </Card>
          <Card className="p-4 bg-card/60 flex flex-col gap-1">
            <span className="font-bold text-sm text-sky-400">2 Fish</span>
            <p className="text-xs text-muted-foreground">
              Draw the top card from the draw pile directly into your hand.
            </p>
          </Card>
          <Card className="p-4 bg-card/60 flex flex-col gap-1">
            <span className="font-bold text-sm text-sky-400">
              Swimmer + Shark
            </span>
            <p className="text-xs text-muted-foreground">
              Steal a random card from an opponent&apos;s hand into your hand.
            </p>
          </Card>
        </div>
      </div>

      {/* Set Collections */}
      <div className="flex flex-col gap-4">
        <h2 className="font-headline text-xl font-bold text-foreground flex items-center gap-2">
          <Award className="size-5 text-sky-400" /> Set Collections (Kept in
          hand)
        </h2>
        <Card className="p-4 bg-card/60 flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2 rounded bg-card border border-border/50">
              <span className="font-bold text-foreground block">
                Shells (6 total)
              </span>
              <span className="text-muted-foreground">
                0, 0, 2, 4, 6, 9, 12 pts
              </span>
            </div>
            <div className="p-2 rounded bg-card border border-border/50">
              <span className="font-bold text-foreground block">
                Octopuses (5 total)
              </span>
              <span className="text-muted-foreground">
                0, 0, 1, 3, 6, 9 pts
              </span>
            </div>
            <div className="p-2 rounded bg-card border border-border/50">
              <span className="font-bold text-foreground block">
                Penguins (3 total)
              </span>
              <span className="text-muted-foreground">1, 3, 5 pts</span>
            </div>
            <div className="p-2 rounded bg-card border border-border/50">
              <span className="font-bold text-foreground block">
                Sailors (2 total)
              </span>
              <span className="text-muted-foreground">0, 5 pts (pair)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Multipliers & Mermaids */}
      <div className="flex flex-col gap-4">
        <h2 className="font-headline text-xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="size-5 text-amber-400" /> Multipliers & Mermaids
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4 bg-card/60 flex flex-col gap-1">
            <span className="font-bold text-sm text-foreground">
              Multipliers
            </span>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
              <li>
                <strong>Lighthouse:</strong> +1 pt per Boat card (in hand or
                duos)
              </li>
              <li>
                <strong>Shoal of Fish:</strong> +1 pt per Fish card (in hand or
                duos)
              </li>
              <li>
                <strong>Penguin Colony:</strong> +2 pts per Penguin card
              </li>
              <li>
                <strong>Captain:</strong> +3 pts per Sailor card
              </li>
            </ul>
          </Card>
          <Card className="p-4 bg-card/60 flex flex-col gap-1 border-sky-500/30">
            <span className="font-bold text-sm text-sky-400">
              Mermaids (4 in deck)
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each mermaid awards 1 point per card of your most numerous color.
              If you hold 2 mermaids, they score your #1 and #2 most numerous
              colors.
              <br />
              <strong className="text-emerald-400">4 Mermaids:</strong> If a
              player collects all 4 mermaids, they immediately win the entire
              game!
            </p>
          </Card>
        </div>
      </div>

      {/* Stop vs Last Chance */}
      <div className="flex flex-col gap-4">
        <h2 className="font-headline text-xl font-bold text-foreground">
          Ending the Round (≥ 7 Points)
        </h2>
        <Card className="p-4 bg-card/60 flex flex-col gap-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            When a player reaches <strong>7 or more points</strong>, they can
            declare the end of the round on their turn:
          </p>
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <div className="p-3 rounded-lg bg-card border border-border/60 flex flex-col gap-1">
              <span className="font-bold text-foreground">STOP (Safe)</span>
              <p>
                Round ends immediately. All players reveal hands and score all
                their points (duos + sets + multipliers + mermaids).
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-amber-500/40 flex flex-col gap-1">
              <span className="font-bold text-amber-300">
                LAST CHANCE (Bet)
              </span>
              <p>
                Every opponent gets one final turn. If the declarer has{" "}
                <strong>strictly more points</strong> than everyone else, they
                score points + Color Bonus (opponents score ONLY their Color
                Bonus!). If an opponent ties or beats the declarer, the declarer
                only scores their Color Bonus.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
