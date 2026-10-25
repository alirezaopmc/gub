"use client";

import { Button, Card } from "@manovaspace/ui";
import { ArrowLeft, Check, Minus, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { calculateInstantScore } from "@/lib/games/scout/engine/scoring";

export function ScoutCalculatorView() {
  const [cardsCollected, setCardsCollected] = useState(0);
  const [scoutChips, setScoutChips] = useState(0);
  const [handCards, setHandCards] = useState(0);
  const [isOwnerExempt, setIsOwnerExempt] = useState(false);

  const totalScore = calculateInstantScore(
    cardsCollected,
    scoutChips,
    handCards,
    isOwnerExempt,
  );

  const reset = () => {
    setCardsCollected(0);
    setScoutChips(0);
    setHandCards(0);
    setIsOwnerExempt(false);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-xl mx-auto w-full">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/games/scout">
            <ArrowLeft className="size-4" /> Hub
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="gap-2 text-muted-foreground"
        >
          <RotateCcw className="size-4" /> Reset
        </Button>
      </div>

      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-headline text-2xl font-bold text-foreground">
          Scout Calculator
        </h1>
        <p className="text-xs text-muted-foreground">
          Instant single-player round score computation
        </p>
      </div>

      {/* Main Score Result Display */}
      <Card className="border-amber-500/40 bg-gradient-to-b from-card to-amber-950/20 text-center py-6 shadow-xl">
        <span className="font-label text-xs uppercase tracking-widest text-muted-foreground">
          Total Round Score
        </span>
        <div
          className={`font-headline text-5xl font-black my-2 ${
            totalScore > 0
              ? "text-emerald-400"
              : totalScore < 0
                ? "text-rose-400"
                : "text-foreground"
          }`}
        >
          {totalScore > 0 ? `+${totalScore}` : totalScore}
        </div>
        <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground font-mono">
          <span>+{cardsCollected} cards</span>
          <span>•</span>
          <span>+{scoutChips} chips</span>
          <span>•</span>
          <span>-{isOwnerExempt ? 0 : handCards} penalty</span>
        </div>
      </Card>

      {/* Interactive Controls */}
      <div className="flex flex-col gap-4">
        {/* Cards in Score Pile */}
        <Card className="p-4 flex items-center justify-between bg-card/60">
          <div>
            <div className="font-bold text-sm text-foreground">
              Cards Collected
            </div>
            <div className="text-xs text-muted-foreground">
              +1 point per card beaten
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCardsCollected((c) => Math.max(0, c - 1))}
              disabled={cardsCollected === 0}
            >
              <Minus className="size-4" />
            </Button>
            <span className="font-mono text-lg font-bold w-8 text-center">
              {cardsCollected}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCardsCollected((c) => c + 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </Card>

        {/* Scout Chips */}
        <Card className="p-4 flex items-center justify-between bg-card/60">
          <div>
            <div className="font-bold text-sm text-foreground">Scout Chips</div>
            <div className="text-xs text-muted-foreground">
              +1 point per chip earned
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setScoutChips((c) => Math.max(0, c - 1))}
              disabled={scoutChips === 0}
            >
              <Minus className="size-4" />
            </Button>
            <span className="font-mono text-lg font-bold w-8 text-center">
              {scoutChips}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setScoutChips((c) => c + 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </Card>

        {/* Cards Remaining in Hand */}
        <Card className="p-4 flex items-center justify-between bg-card/60">
          <div>
            <div className="font-bold text-sm text-foreground">
              Cards Left in Hand
            </div>
            <div className="text-xs text-muted-foreground">
              -1 point per unplayed card
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setHandCards((c) => Math.max(0, c - 1))}
              disabled={handCards === 0}
            >
              <Minus className="size-4" />
            </Button>
            <span className="font-mono text-lg font-bold w-8 text-center">
              {handCards}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setHandCards((c) => c + 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </Card>

        {/* Exempt Owner Toggle */}
        <button
          type="button"
          onClick={() => setIsOwnerExempt((prev) => !prev)}
          className={`flex items-center justify-between p-4 rounded-xl border text-left transition-colors cursor-pointer ${
            isOwnerExempt
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
              : "border-border bg-card/40 text-muted-foreground hover:bg-card/70"
          }`}
        >
          <div>
            <div className="font-bold text-xs uppercase tracking-wide text-foreground">
              Table Cleared (Set Owner)
            </div>
            <div className="text-xs text-muted-foreground">
              Round ended by opponents passing back to you — hand penalty is
              waived!
            </div>
          </div>
          <div
            className={`size-6 rounded-lg border flex items-center justify-center ${
              isOwnerExempt
                ? "border-emerald-400 bg-emerald-500 text-black font-bold"
                : "border-muted-foreground/40 bg-muted/20"
            }`}
          >
            {isOwnerExempt && <Check className="size-4 stroke-[3]" />}
          </div>
        </button>
      </div>
    </div>
  );
}
