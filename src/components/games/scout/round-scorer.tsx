"use client";

import { Badge, Button, Card } from "@manovaspace/ui";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  RotateCcw,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { calculateInstantScore } from "@/lib/games/scout/engine/scoring";

export type PlayerRoundInput = {
  name: string;
  cardsCollected: number;
  scoutChips: number;
  cardsInHand: number;
  isOwnerExempt: boolean;
};

export type CompletedRoundRecord = {
  roundNumber: number;
  scores: number[];
};

export function ScoutRoundScorer() {
  const [playerCount, setPlayerCount] = useState<number>(3);
  const [playerNames, setPlayerNames] = useState<string[]>([
    "Player 1",
    "Player 2",
    "Player 3",
  ]);

  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundHistory, setRoundHistory] = useState<CompletedRoundRecord[]>([]);

  // Current round inputs
  const [roundInputs, setRoundInputs] = useState<PlayerRoundInput[]>([
    {
      name: "Player 1",
      cardsCollected: 0,
      scoutChips: 0,
      cardsInHand: 0,
      isOwnerExempt: false,
    },
    {
      name: "Player 2",
      cardsCollected: 0,
      scoutChips: 0,
      cardsInHand: 0,
      isOwnerExempt: false,
    },
    {
      name: "Player 3",
      cardsCollected: 0,
      scoutChips: 0,
      cardsInHand: 0,
      isOwnerExempt: false,
    },
  ]);

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const names = Array.from(
      { length: count },
      (_, i) => playerNames[i] ?? `Player ${i + 1}`,
    );
    setPlayerNames(names);
    setRoundInputs(
      Array.from({ length: count }, (_, i) => ({
        name: names[i] ?? `Player ${i + 1}`,
        cardsCollected: 0,
        scoutChips: 0,
        cardsInHand: 0,
        isOwnerExempt: false,
      })),
    );
    setRoundHistory([]);
    setCurrentRound(1);
  };

  const updateInput = (
    index: number,
    field: keyof Omit<PlayerRoundInput, "name">,
    value: number | boolean,
  ) => {
    setRoundInputs((prev) =>
      prev.map((inp, idx) =>
        idx === index ? { ...inp, [field]: value } : inp,
      ),
    );
  };

  // Cumulative totals calculation
  const cumulativeScores = Array.from({ length: playerCount }, (_, pIdx) => {
    const historicalTotal = roundHistory.reduce(
      (sum, r) => sum + (r.scores[pIdx] ?? 0),
      0,
    );
    return historicalTotal;
  });

  const finishRound = () => {
    const currentScores = roundInputs.map((inp) =>
      calculateInstantScore(
        inp.cardsCollected,
        inp.scoutChips,
        inp.cardsInHand,
        inp.isOwnerExempt,
      ),
    );

    setRoundHistory((prev) => [
      ...prev,
      { roundNumber: currentRound, scores: currentScores },
    ]);

    // Reset inputs for next round
    setRoundInputs(
      Array.from({ length: playerCount }, (_, i) => ({
        name: playerNames[i] ?? `Player ${i + 1}`,
        cardsCollected: 0,
        scoutChips: 0,
        cardsInHand: 0,
        isOwnerExempt: false,
      })),
    );

    setCurrentRound((c) => c + 1);
  };

  const resetAll = () => {
    handlePlayerCountChange(playerCount);
  };

  const isGameOver =
    currentRound > playerCount && roundHistory.length >= playerCount;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/games/scout">
            <ArrowLeft className="size-4" /> Hub
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-500/30 text-amber-400"
          >
            Round {Math.min(currentRound, playerCount)} of {playerCount}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="gap-1 text-muted-foreground"
          >
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-center sm:text-left">
        <h1 className="font-headline text-2xl font-bold text-foreground">
          Scout Round Companion
        </h1>
        <p className="text-xs text-muted-foreground">
          Tableside scorekeeper for 3–5 player games
        </p>
      </div>

      {/* Player Count Selector (disabled once match starts) */}
      {roundHistory.length === 0 && (
        <Card className="p-4 bg-muted/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                Crew Size:
              </span>
            </div>
            <div className="flex gap-2">
              {[3, 4, 5].map((count) => (
                <Button
                  key={count}
                  size="sm"
                  variant={playerCount === count ? "default" : "outline"}
                  onClick={() => handlePlayerCountChange(count)}
                >
                  {count} Players
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Cumulative Standings Header */}
      {roundHistory.length > 0 && (
        <Card className="p-4 bg-card/60 border-amber-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="font-label text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="size-3.5 text-amber-400" /> Cumulative
              Leaderboard
            </span>
            {isGameOver && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                Match Complete!
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {playerNames.map((name, idx) => {
              const total = cumulativeScores[idx] ?? 0;
              return (
                <div
                  key={name}
                  className="p-2.5 rounded-lg border border-border bg-background/80 flex flex-col items-center"
                >
                  <span className="text-xs font-semibold text-muted-foreground truncate max-w-full">
                    {name}
                  </span>
                  <span
                    className={`font-mono text-xl font-bold ${
                      total > 0
                        ? "text-emerald-400"
                        : total < 0
                          ? "text-rose-400"
                          : "text-foreground"
                    }`}
                  >
                    {total}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Active Round Inputs */}
      {!isGameOver && (
        <div className="flex flex-col gap-4">
          <div className="font-label text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Enter Round {currentRound} Results
          </div>

          {roundInputs.map((input, idx) => {
            const subtotal = calculateInstantScore(
              input.cardsCollected,
              input.scoutChips,
              input.cardsInHand,
              input.isOwnerExempt,
            );

            return (
              <Card
                key={idx}
                className="p-4 flex flex-col gap-3 bg-card/80 border-border"
              >
                {/* Player Name and Subtotal preview */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="size-5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-sm text-foreground">
                      {input.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Round Subtotal:
                    </span>
                    <span
                      className={`font-mono text-base font-bold ${
                        subtotal > 0
                          ? "text-emerald-400"
                          : subtotal < 0
                            ? "text-rose-400"
                            : "text-foreground"
                      }`}
                    >
                      {subtotal > 0 ? `+${subtotal}` : subtotal}
                    </span>
                  </div>
                </div>

                {/* Score Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Cards Collected */}
                  <div className="flex flex-col gap-1 p-2 rounded-lg bg-background border border-border/40">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Cards Won (+1)
                    </span>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          updateInput(
                            idx,
                            "cardsCollected",
                            Math.max(0, input.cardsCollected - 1),
                          )
                        }
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="font-mono text-sm font-bold">
                        {input.cardsCollected}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          updateInput(
                            idx,
                            "cardsCollected",
                            input.cardsCollected + 1,
                          )
                        }
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Scout Chips */}
                  <div className="flex flex-col gap-1 p-2 rounded-lg bg-background border border-border/40">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Chips (+1)
                    </span>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          updateInput(
                            idx,
                            "scoutChips",
                            Math.max(0, input.scoutChips - 1),
                          )
                        }
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="font-mono text-sm font-bold">
                        {input.scoutChips}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          updateInput(idx, "scoutChips", input.scoutChips + 1)
                        }
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Hand Cards */}
                  <div className="flex flex-col gap-1 p-2 rounded-lg bg-background border border-border/40">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Cards Left (-1)
                    </span>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          updateInput(
                            idx,
                            "cardsInHand",
                            Math.max(0, input.cardsInHand - 1),
                          )
                        }
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="font-mono text-sm font-bold">
                        {input.cardsInHand}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          updateInput(idx, "cardsInHand", input.cardsInHand + 1)
                        }
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Table Cleared Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    updateInput(idx, "isOwnerExempt", !input.isOwnerExempt)
                  }
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                    input.isOwnerExempt
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-border/40 bg-background/50 text-muted-foreground"
                  }`}
                >
                  <span>
                    Table cleared owner (Waive -{input.cardsInHand} penalty)
                  </span>
                  {input.isOwnerExempt && (
                    <Check className="size-3.5 text-emerald-400" />
                  )}
                </button>
              </Card>
            );
          })}

          <Button
            onClick={finishRound}
            className="w-full font-bold bg-amber-500 text-black hover:bg-amber-400 py-6 text-sm"
          >
            Complete Round {currentRound} &rarr;
          </Button>
        </div>
      )}
    </div>
  );
}
