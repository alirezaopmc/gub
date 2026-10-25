import { Badge, Button, Card } from "@manovaspace/ui";
import { ArrowLeft, Award, Layers, Sparkles } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Scout Rules & Reference | GUB",
  description:
    "Official Scout card game rules, combination rankings, and scoring guide.",
};

export default function ScoutDocsPage() {
  return (
    <div className="flex flex-col gap-8 px-4 py-8 max-w-3xl mx-auto w-full">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/games/scout">
            <ArrowLeft className="size-4" /> Scout Hub
          </Link>
        </Button>
        <Badge variant="outline" className="border-amber-500/40 text-amber-400">
          Rules Reference
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-headline text-3xl font-extrabold text-foreground">
          How to Play Scout
        </h1>
        <p className="text-muted-foreground text-sm">
          A ladder-climbing card game by Kei Kajino (Oink Games) for 3–5
          players.
        </p>
      </div>

      {/* The Cardinal Rule */}
      <Card className="border-amber-500/30 bg-amber-500/5 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-base text-foreground">
              The Fixed Hand Rule
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              When dealt cards, you <strong>cannot rearrange your hand</strong>.
              Before starting the round, you may inspect your hand and flip it
              upside down once. You only play cards that are already adjacent!
            </p>
          </div>
        </div>
      </Card>

      {/* Combination Hierarchy */}
      <div className="flex flex-col gap-4">
        <h2 className="font-label text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Layers className="size-4 text-amber-400" /> Combination Strength
          Rankings
        </h2>
        <div className="space-y-3">
          <Card className="p-4 bg-card/60">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-foreground">
                1. More Cards Beat Fewer Cards
              </span>
              <Badge className="bg-amber-500 text-black font-bold">
                Top Priority
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              A 3-card combination (e.g. 2-3-4 run) beats <strong>any</strong>{" "}
              2-card combination (even a pair of 10s).
            </p>
          </Card>

          <Card className="p-4 bg-card/60">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-foreground">
                2. Sets Beat Runs (Equal Count)
              </span>
              <Badge variant="outline">Tiebreaker</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              At equal number of cards, a <strong>Set</strong> (matching numbers
              like 7-7) beats a <strong>Run</strong> (consecutive numbers like
              8-9).
            </p>
          </Card>

          <Card className="p-4 bg-card/60">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-foreground">
                3. Higher Value Wins
              </span>
              <Badge variant="outline">Same Type</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              For matching types: Pair of 9s beats Pair of 8s. Run of 4-5-6
              beats Run of 3-4-5. Single 8 beats Single 7.
            </p>
          </Card>
        </div>
      </div>

      {/* Scoring Section */}
      <div className="flex flex-col gap-4">
        <h2 className="font-label text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Award className="size-4 text-amber-400" /> Round Scoring Formula
        </h2>
        <Card className="p-5 bg-card/80 border-border">
          <div className="font-mono text-center text-sm sm:text-base font-bold text-amber-400 p-3 rounded-lg bg-background border border-border/50 mb-4">
            Score = (Cards Won) + (Scout Chips) &minus; (Cards Left in Hand)
          </div>
          <ul className="text-xs sm:text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>
              <strong>+1 point</strong> per card in your score pile (beaten
              combinations).
            </li>
            <li>
              <strong>+1 point</strong> per scout chip earned when opponents
              scouted from your combination.
            </li>
            <li>
              <strong>&minus;1 point</strong> per card remaining in hand when
              another player empties their hand.
            </li>
            <li>
              <strong>Exemption:</strong> If every opponent scouts and the table
              clears back to you, you do <em>not</em> lose points for cards left
              in your hand!
            </li>
          </ul>
        </Card>
      </div>

      {/* Quick Launch Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
        <Button
          asChild
          className="flex-1 bg-amber-500 text-black hover:bg-amber-400 font-bold"
        >
          <Link href="/games/scout/round">Open Round Companion</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/games/scout/calculator">Open Quick Calculator</Link>
        </Button>
      </div>
    </div>
  );
}
