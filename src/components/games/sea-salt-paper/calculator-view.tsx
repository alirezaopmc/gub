"use client";

import { Button, Card } from "@manovaspace/ui";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { calculateHandBreakdown } from "@/lib/games/sea-salt-paper/engine/scoring";
import type { HandCounts } from "@/lib/games/sea-salt-paper/engine/types";

export function SeaSaltCalculatorView() {
  const [counts, setCounts] = useState<HandCounts>({
    crabPairs: 0,
    boatPairs: 0,
    fishPairs: 0,
    swimmerSharkPairs: 0,
    shells: 0,
    octopuses: 0,
    penguins: 0,
    sailors: 0,
    lighthouse: 0,
    shoalOfFish: 0,
    penguinColony: 0,
    captain: 0,
    mermaids: 0,
    highestColorCount: 0,
    secondColorCount: 0,
  });

  const update = (
    field: keyof HandCounts,
    delta: number,
    min = 0,
    max = 99,
  ) => {
    setCounts((prev) => {
      const current = (prev[field] as number) ?? 0;
      const next = Math.max(min, Math.min(max, current + delta));
      return { ...prev, [field]: next };
    });
  };

  const reset = () => {
    setCounts({
      crabPairs: 0,
      boatPairs: 0,
      fishPairs: 0,
      swimmerSharkPairs: 0,
      shells: 0,
      octopuses: 0,
      penguins: 0,
      sailors: 0,
      lighthouse: 0,
      shoalOfFish: 0,
      penguinColony: 0,
      captain: 0,
      mermaids: 0,
      highestColorCount: 0,
      secondColorCount: 0,
    });
  };

  const breakdown = calculateHandBreakdown(counts);
  const canDeclare = breakdown.rawTotal >= 7;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-xl mx-auto w-full">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/games/sea-salt-paper">
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
          Sea Salt & Paper Calculator
        </h1>
        <p className="text-xs text-muted-foreground">
          Instant hand & scoring calculator with duo, set, multiplier and
          mermaid evaluation
        </p>
      </div>

      {/* Main Score Result Display */}
      <Card className="border-sky-500/40 bg-gradient-to-b from-card to-sky-950/20 text-center py-6 shadow-xl">
        <span className="font-label text-xs uppercase tracking-widest text-muted-foreground">
          Hand Score
        </span>
        <div className="font-headline text-5xl font-black text-sky-400 mt-2">
          {breakdown.hasFourMermaids ? "WIN!" : breakdown.rawTotal}
        </div>

        {breakdown.hasFourMermaids ? (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
            <Sparkles className="size-3.5" /> 4 Mermaids = Instant Game Win!
          </div>
        ) : canDeclare ? (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
            <Check className="size-3.5" /> ≥ 7 Points: Can declare STOP or LAST
            CHANCE!
          </div>
        ) : (
          <span className="text-xs text-muted-foreground mt-2 block">
            Need {Math.max(0, 7 - breakdown.rawTotal)} more points to declare
            Stop / Last Chance
          </span>
        )}

        {/* Subtotal Pill Breakdown */}
        <div className="mt-5 grid grid-cols-4 gap-2 px-4 text-center border-t border-border/40 pt-4">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block">
              Duos
            </span>
            <span className="font-mono text-sm font-bold text-foreground">
              +{breakdown.duoPoints}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block">
              Sets
            </span>
            <span className="font-mono text-sm font-bold text-foreground">
              +
              {breakdown.shellPoints +
                breakdown.octopusPoints +
                breakdown.penguinPoints +
                breakdown.sailorPoints}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block">
              Multipliers
            </span>
            <span className="font-mono text-sm font-bold text-foreground">
              +{breakdown.multiplierPoints}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block">
              Mermaids
            </span>
            <span className="font-mono text-sm font-bold text-foreground">
              +{breakdown.mermaidPoints}
            </span>
          </div>
        </div>
      </Card>

      {/* Duo Pairs Section */}
      <div className="flex flex-col gap-3">
        <h2 className="font-label text-xs font-bold uppercase tracking-wider text-muted-foreground">
          1. Duo Pairs (1 pt each + power)
        </h2>
        <Card className="p-4 grid grid-cols-2 gap-3 bg-card/60">
          <StepperItem
            label="Crab Pairs"
            sub="Pick from discard"
            value={counts.crabPairs}
            onChange={(d) => update("crabPairs", d)}
          />
          <StepperItem
            label="Boat Pairs"
            sub="Extra turn"
            value={counts.boatPairs}
            onChange={(d) => update("boatPairs", d)}
          />
          <StepperItem
            label="Fish Pairs"
            sub="Draw top card"
            value={counts.fishPairs}
            onChange={(d) => update("fishPairs", d)}
          />
          <StepperItem
            label="Swimmer + Shark"
            sub="Steal random card"
            value={counts.swimmerSharkPairs}
            onChange={(d) => update("swimmerSharkPairs", d)}
          />
        </Card>
      </div>

      {/* Set Collections Section */}
      <div className="flex flex-col gap-3">
        <h2 className="font-label text-xs font-bold uppercase tracking-wider text-muted-foreground">
          2. Set Collections
        </h2>
        <Card className="p-4 grid grid-cols-2 gap-3 bg-card/60">
          <StepperItem
            label="Shells"
            sub="0, 0, 2, 4, 6, 9, 12 pts"
            value={counts.shells}
            onChange={(d) => update("shells", d, 0, 6)}
          />
          <StepperItem
            label="Octopuses"
            sub="0, 0, 1, 3, 6, 9 pts"
            value={counts.octopuses}
            onChange={(d) => update("octopuses", d, 0, 5)}
          />
          <StepperItem
            label="Penguins"
            sub="1, 3, 5 pts"
            value={counts.penguins}
            onChange={(d) => update("penguins", d, 0, 3)}
          />
          <StepperItem
            label="Sailors"
            sub="0, 5 pts (pair)"
            value={counts.sailors}
            onChange={(d) => update("sailors", d, 0, 2)}
          />
        </Card>
      </div>

      {/* Multipliers Section */}
      <div className="flex flex-col gap-3">
        <h2 className="font-label text-xs font-bold uppercase tracking-wider text-muted-foreground">
          3. Multiplier Cards
        </h2>
        <Card className="p-4 grid grid-cols-2 gap-3 bg-card/60">
          <StepperItem
            label="Lighthouse"
            sub="+1 per boat card"
            value={counts.lighthouse}
            onChange={(d) => update("lighthouse", d, 0, 1)}
          />
          <StepperItem
            label="Shoal of Fish"
            sub="+1 per fish card"
            value={counts.shoalOfFish}
            onChange={(d) => update("shoalOfFish", d, 0, 1)}
          />
          <StepperItem
            label="Penguin Colony"
            sub="+2 per penguin"
            value={counts.penguinColony}
            onChange={(d) => update("penguinColony", d, 0, 1)}
          />
          <StepperItem
            label="Captain"
            sub="+3 per sailor"
            value={counts.captain}
            onChange={(d) => update("captain", d, 0, 1)}
          />
        </Card>
      </div>

      {/* Mermaids & Color Bonus */}
      <div className="flex flex-col gap-3">
        <h2 className="font-label text-xs font-bold uppercase tracking-wider text-muted-foreground">
          4. Mermaids & Colors
        </h2>
        <Card className="p-4 flex flex-col gap-3 bg-card/60">
          <StepperItem
            label="Mermaids"
            sub="1 pt per card of most numerous color (4 = instant win!)"
            value={counts.mermaids}
            onChange={(d) => update("mermaids", d, 0, 4)}
          />
          {counts.mermaids > 0 && counts.mermaids < 4 && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <StepperItem
                label="#1 Color Count"
                sub="Cards of top color"
                value={counts.highestColorCount ?? 0}
                onChange={(d) => update("highestColorCount", d, 0, 15)}
              />
              {counts.mermaids >= 2 && (
                <StepperItem
                  label="#2 Color Count"
                  sub="Cards of 2nd color"
                  value={counts.secondColorCount ?? 0}
                  onChange={(d) => update("secondColorCount", d, 0, 15)}
                />
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StepperItem({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  onChange: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-card/80 border border-border/50">
      <div className="flex flex-col min-w-0 pr-2">
        <span className="font-bold text-xs text-foreground truncate">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground truncate">
          {sub}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7 rounded-md"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(-1)}
          disabled={value <= 0}
        >
          <Minus className="size-3" />
        </Button>
        <span className="font-mono text-sm font-bold w-5 text-center text-foreground">
          {value}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7 rounded-md"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(1)}
        >
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  );
}
