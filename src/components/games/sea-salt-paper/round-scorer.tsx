"use client";

import { Button, Card, Input } from "@manovaspace/ui";
import {
  ArrowLeft,
  Crown,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  calculateHandBreakdown,
  resolveSeaSaltRound,
} from "@/lib/games/sea-salt-paper/engine/scoring";
import {
  type RoundDeclaration,
  type SeaSaltRoundSummary,
  WIN_TARGET_SCORES,
} from "@/lib/games/sea-salt-paper/engine/types";

interface PlayerInputState {
  id: string;
  name: string;
  rawScore: number;
  colorBonus: number;
  declaration: RoundDeclaration;
  hasFourMermaids: boolean;
}

export function SeaSaltRoundScorer() {
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>([
    "Player 1",
    "Player 2",
  ]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundHistory, setRoundHistory] = useState<SeaSaltRoundSummary[]>([]);

  const targetScore = WIN_TARGET_SCORES[playerCount] ?? 35;

  const [inputs, setInputs] = useState<PlayerInputState[]>([
    {
      id: "player-1",
      name: "Player 1",
      rawScore: 0,
      colorBonus: 0,
      declaration: "none",
      hasFourMermaids: false,
    },
    {
      id: "player-2",
      name: "Player 2",
      rawScore: 0,
      colorBonus: 0,
      declaration: "none",
      hasFourMermaids: false,
    },
  ]);

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const names = Array.from(
      { length: count },
      (_, i) => playerNames[i] ?? `Player ${i + 1}`,
    );
    setPlayerNames(names);
    setInputs(
      Array.from({ length: count }, (_, i) => ({
        id: `player-${i + 1}`,
        name: names[i] ?? `Player ${i + 1}`,
        rawScore: 0,
        colorBonus: 0,
        declaration: "none",
        hasFourMermaids: false,
      })),
    );
    setRoundHistory([]);
    setCurrentRound(1);
  };

  const updateInput = <K extends keyof PlayerInputState>(
    index: number,
    field: K,
    value: PlayerInputState[K],
  ) => {
    setInputs((prev) => {
      const copy = [...prev];
      const target = copy[index];
      if (!target) return prev;

      if (
        field === "declaration" &&
        (value === "stop" || value === "last_chance")
      ) {
        // Only one player can declare Stop or Last Chance per round
        for (let i = 0; i < copy.length; i++) {
          const item = copy[i];
          if (item && i !== index && item.declaration !== "none") {
            copy[i] = { ...item, declaration: "none" };
          }
        }
      }

      copy[index] = { ...target, [field]: value };
      return copy;
    });
  };

  // Cumulative scores across rounds
  const cumulativeScores = Array.from({ length: playerCount }, (_, pIdx) => {
    return roundHistory.reduce((sum, r) => {
      const pRes = r.playerResults[pIdx];
      return sum + (pRes?.finalRoundScore ?? 0);
    }, 0);
  });

  const instantWinSummary = roundHistory.find((r) => r.winnerPlayerId);
  const highestScore = Math.max(0, ...cumulativeScores);
  const isTargetReached =
    highestScore >= targetScore || Boolean(instantWinSummary);

  const finishRound = () => {
    const roundSummary = resolveSeaSaltRound(
      currentRound,
      inputs.map((inp) => ({
        playerId: inp.id,
        playerName: inp.name,
        declaration: inp.declaration,
        colorBonus: inp.colorBonus,
        counts: {
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
          mermaids: inp.hasFourMermaids ? 4 : 0,
          highestColorCount: inp.colorBonus,
        },
      })),
    );

    // If no 4 mermaids, override raw total directly with player input score
    if (!roundSummary.winnerPlayerId) {
      const hasLastChance = inputs.some((i) => i.declaration === "last_chance");
      if (hasLastChance) {
        const declarer = inputs.find((i) => i.declaration === "last_chance")!;
        const opponents = inputs.filter((i) => i.id !== declarer.id);
        const maxOpponent = Math.max(...opponents.map((o) => o.rawScore));
        const wonLastChance = declarer.rawScore > maxOpponent;

        roundSummary.playerResults = inputs.map((inp) => {
          const isDeclarer = inp.id === declarer.id;
          const finalRoundScore = isDeclarer
            ? wonLastChance
              ? inp.rawScore + inp.colorBonus
              : inp.colorBonus
            : wonLastChance
              ? inp.colorBonus
              : inp.rawScore;

          return {
            playerId: inp.id,
            playerName: inp.name,
            declaration: inp.declaration,
            counts: {
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
            },
            breakdown: calculateHandBreakdown({
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
            }),
            colorBonus: inp.colorBonus,
            finalRoundScore,
            wonLastChance: isDeclarer ? wonLastChance : undefined,
          };
        });
      } else {
        // Normal or Stop
        roundSummary.playerResults = inputs.map((inp) => ({
          playerId: inp.id,
          playerName: inp.name,
          declaration: inp.declaration,
          counts: {
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
          },
          breakdown: calculateHandBreakdown({
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
          }),
          colorBonus: inp.colorBonus,
          finalRoundScore: inp.rawScore,
        }));
      }
    }

    setRoundHistory((prev) => [...prev, roundSummary]);

    // Reset inputs for next round
    setInputs(
      Array.from({ length: playerCount }, (_, i) => ({
        id: `player-${i + 1}`,
        name: playerNames[i] ?? `Player ${i + 1}`,
        rawScore: 0,
        colorBonus: 0,
        declaration: "none",
        hasFourMermaids: false,
      })),
    );

    setCurrentRound((c) => c + 1);
  };

  const resetAll = () => {
    handlePlayerCountChange(playerCount);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-xl mx-auto w-full">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/games/sea-salt-paper">
            <ArrowLeft className="size-4" /> Hub
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetAll}
          className="gap-2 text-muted-foreground"
        >
          <RotateCcw className="size-4" /> Reset Game
        </Button>
      </div>

      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-headline text-2xl font-bold text-foreground">
          Sea Salt & Paper Companion
        </h1>
        <p className="text-xs text-muted-foreground">
          Tableside multiplayer scoring, Stop vs Last Chance declarations &
          running leaderboard
        </p>
      </div>

      {/* Player Count & Win Target Selector */}
      <Card className="p-4 flex flex-col gap-3 bg-card/60">
        <div className="flex items-center justify-between">
          <span className="font-label text-xs uppercase tracking-wider text-muted-foreground">
            Player Count
          </span>
          <div className="flex items-center gap-1.5">
            {[2, 3, 4].map((count) => (
              <Button
                key={count}
                type="button"
                size="sm"
                variant={playerCount === count ? "default" : "outline"}
                onClick={() => handlePlayerCountChange(count)}
              >
                {count}P
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
          <span>Target to Win:</span>
          <span className="font-mono font-bold text-sky-400">
            {targetScore} Points
          </span>
        </div>
      </Card>

      {/* Running Leaderboard */}
      <Card className="p-4 flex flex-col gap-3 border-sky-500/30 bg-gradient-to-b from-card to-sky-950/20">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <span className="font-label text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Trophy className="size-4 text-sky-400" /> Standings (Round{" "}
            {currentRound})
          </span>
          {isTargetReached && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Crown className="size-3.5" /> Game Finished!
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {inputs.map((inp, idx) => {
            const score = cumulativeScores[idx] ?? 0;
            const isLeader = score === highestScore && score > 0;

            return (
              <div
                key={inp.id}
                className="p-2.5 rounded-lg bg-card/80 border border-border/50 flex flex-col gap-1 items-center text-center relative"
              >
                {isLeader && (
                  <Crown className="size-3.5 text-amber-400 absolute top-1.5 right-1.5" />
                )}
                <span className="text-xs font-bold text-foreground truncate w-full">
                  {inp.name}
                </span>
                <span className="font-mono text-xl font-black text-sky-400">
                  {score}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {targetScore - score > 0
                    ? `${targetScore - score} to win`
                    : "Target reached!"}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Round Input Form */}
      {!isTargetReached ? (
        <div className="flex flex-col gap-4">
          <div className="font-label text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Enter Round {currentRound} Results
          </div>

          {inputs.map((input, idx) => (
            <Card
              key={input.id}
              className="p-4 flex flex-col gap-3 bg-card/80 border-border"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="size-5 rounded-full bg-sky-500/20 text-sky-400 font-mono text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <Input
                    value={input.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPlayerNames((prev) => {
                        const copy = [...prev];
                        copy[idx] = val;
                        return copy;
                      });
                      updateInput(idx, "name", val);
                    }}
                    className="h-7 w-28 text-xs font-bold bg-transparent"
                  />
                </div>

                {/* Declaration Selector */}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={input.declaration === "none" ? "outline" : "ghost"}
                    className="h-6 text-[10px] px-2"
                    onClick={() => updateInput(idx, "declaration", "none")}
                  >
                    None
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      input.declaration === "stop" ? "default" : "outline"
                    }
                    className="h-6 text-[10px] px-2"
                    onClick={() => updateInput(idx, "declaration", "stop")}
                  >
                    STOP
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      input.declaration === "last_chance"
                        ? "default"
                        : "outline"
                    }
                    className="h-6 text-[10px] px-2 text-amber-300"
                    onClick={() =>
                      updateInput(idx, "declaration", "last_chance")
                    }
                  >
                    LAST CHANCE
                  </Button>
                </div>
              </div>

              {/* Hand Score & Color Bonus */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/40">
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-foreground">
                      Hand Points
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Duos + Sets + Mult
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-6 rounded"
                      onClick={() =>
                        updateInput(
                          idx,
                          "rawScore",
                          Math.max(0, input.rawScore - 1),
                        )
                      }
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="font-mono text-sm font-bold w-6 text-center">
                      {input.rawScore}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-6 rounded"
                      onClick={() =>
                        updateInput(idx, "rawScore", input.rawScore + 1)
                      }
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/40">
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-foreground">
                      Color Bonus
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Top color cards
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-6 rounded"
                      onClick={() =>
                        updateInput(
                          idx,
                          "colorBonus",
                          Math.max(0, input.colorBonus - 1),
                        )
                      }
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="font-mono text-sm font-bold w-6 text-center">
                      {input.colorBonus}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-6 rounded"
                      onClick={() =>
                        updateInput(idx, "colorBonus", input.colorBonus + 1)
                      }
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 4 Mermaids Instant Win Option */}
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={input.hasFourMermaids}
                  onChange={(e) =>
                    updateInput(idx, "hasFourMermaids", e.target.checked)
                  }
                  className="rounded border-border text-sky-500 focus:ring-sky-500"
                />
                <span className="flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-400" /> Player holds 4
                  Mermaids (Instant Win!)
                </span>
              </label>
            </Card>
          ))}

          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={finishRound}
            className="w-full font-bold shadow-lg"
          >
            Complete Round {currentRound}
          </Button>
        </div>
      ) : (
        <Card className="p-6 text-center flex flex-col items-center gap-3 border-emerald-500/50 bg-emerald-950/20">
          <Crown className="size-10 text-amber-400 animate-bounce" />
          <h2 className="text-xl font-bold text-foreground">Game Complete!</h2>
          <p className="text-sm text-muted-foreground">
            Target score achieved! See the final round scores and standings
            below.
          </p>
          <Button
            type="button"
            variant="default"
            onClick={resetAll}
            className="mt-2"
          >
            Start New Game
          </Button>
        </Card>
      )}

      {/* Round History */}
      {roundHistory.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-label text-xs uppercase tracking-wider text-muted-foreground">
            Round History
          </span>
          <div className="flex flex-col gap-2">
            {roundHistory.map((r) => (
              <Card
                key={`round-${r.roundNumber}`}
                className="p-3 text-xs flex flex-col gap-2"
              >
                <div className="flex items-center justify-between font-bold text-muted-foreground border-b border-border/40 pb-1">
                  <span>Round {r.roundNumber}</span>
                  {r.winnerPlayerId && (
                    <span className="text-amber-400 font-bold">
                      4 Mermaids Win!
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {r.playerResults.map((pr) => (
                    <div
                      key={pr.playerId}
                      className="flex justify-between items-center"
                    >
                      <span className="truncate pr-1">{pr.playerName}:</span>
                      <span className="font-mono font-bold text-sky-400">
                        +{pr.finalRoundScore}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
