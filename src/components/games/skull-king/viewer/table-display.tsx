"use client";

import * as React from "react";
import { CardImage } from "@/components/games/skull-king/shared/card-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { joinGameRoom, loadGameSession } from "@/lib/games/common/game-client";
import { useGameSocket } from "@/lib/games/common/use-game-socket";
import { createCard } from "@/lib/games/skull-king/engine/cards";
import type { Card as SkCard } from "@/lib/games/skull-king/engine/types";

function parseCardId(id: string): SkCard {
  if (id === "tigress") return createCard({ kind: "tigress" });
  if (id === "skull_king") return createCard({ kind: "skull_king" });
  if (id === "kraken") return createCard({ kind: "kraken" });
  if (id === "whale") return createCard({ kind: "whale" });
  if (id.startsWith("green:"))
    return createCard({
      kind: "suited",
      suit: "green",
      rank: Number(id.split(":")[1]),
    });
  if (id.startsWith("yellow:"))
    return createCard({
      kind: "suited",
      suit: "yellow",
      rank: Number(id.split(":")[1]),
    });
  if (id.startsWith("purple:"))
    return createCard({
      kind: "suited",
      suit: "purple",
      rank: Number(id.split(":")[1]),
    });
  if (id.startsWith("black:"))
    return createCard({
      kind: "suited",
      suit: "black",
      rank: Number(id.split(":")[1]),
    });
  if (id.startsWith("escape:"))
    return createCard({ kind: "escape", index: Number(id.split(":")[1]) });
  if (id.startsWith("pirate:"))
    return createCard({ kind: "pirate", pirate: id.split(":")[1] as "rosie" });
  if (id.startsWith("mermaid:"))
    return createCard({
      kind: "mermaid",
      mermaid: id.split(":")[1] as "alyra",
    });
  if (id.startsWith("loot:"))
    return createCard({ kind: "loot", index: Number(id.split(":")[1]) });
  return createCard({ kind: "escape", index: 0 });
}

type SkullKingViewData = {
  phase: string;
  roundIndex: number;
  handSize: number;
  mySeat: number;
  handCounts: number[];
  trickLeaderIndex: number;
  currentTrick: {
    card: { id: string; def: any };
    playerIndex: number;
    playOrder: number;
    tigressMode?: string;
  }[];
  completedTricks: any[];
  bids?: (number | null)[];
  tricksWon: number[];
  cumulativeScores: number[];
  roundScores?: number[];
  roundHistory: {
    roundIndex: number;
    handSize: number;
    scores: { main: number; bonus: number; total: number }[];
  }[];
};

export function TableDisplayViewer({ code }: { code: string }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [wakeLockActive, setWakeLockActive] = React.useState(false);
  const [wakeLockSupported, setWakeLockSupported] = React.useState(true);

  // Initialize viewer session
  React.useEffect(() => {
    const existing = loadGameSession(code);
    if (existing?.token) {
      setToken(existing.token);
    } else {
      // Auto-join as viewer
      joinGameRoom(code, "Table Viewer", "viewer")
        .then((res) => {
          setToken(res.token);
        })
        .catch(() => {
          // Will show reconnect UI
        });
    }
  }, [code]);

  // Request screen wake lock for TV/tablet display
  React.useEffect(() => {
    let wakeLock: any = null;

    async function requestLock() {
      if ("wakeLock" in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request("screen");
          setWakeLockActive(true);
          wakeLock.addEventListener("release", () => {
            setWakeLockActive(false);
          });
        } catch {
          setWakeLockActive(false);
        }
      } else {
        setWakeLockSupported(false);
      }
    }

    void requestLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        void wakeLock.release();
      }
    };
  }, []);

  const { status, view, error } = useGameSocket<SkullKingViewData>({
    token,
    roomCode: code,
  });

  if (error && !view) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center text-rose-400">
        <h2 className="text-2xl font-bold">Connection Error</h2>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!token && !view) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold">Connecting Table Display...</h2>
        <p className="mt-2 text-muted-foreground">Joining room {code}</p>
      </div>
    );
  }

  const v = view;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-slate-100 sm:p-10">
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-amber-400">
              SKULL KING
            </h1>
            <Badge
              variant="outline"
              className="text-lg px-3 py-1 font-mono font-bold tracking-widest border-amber-500/50 bg-amber-500/10 text-amber-300"
            >
              {code}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Table Display · Spectator Viewer
          </p>
        </div>

        <div className="flex items-center gap-3">
          {wakeLockActive ? (
            <Badge
              variant="default"
              className="bg-emerald-600/30 border-emerald-500 text-emerald-300"
            >
              Screen Awake
            </Badge>
          ) : !wakeLockSupported ? (
            <span className="text-xs text-slate-400">
              Keep screen awake manually
            </span>
          ) : null}

          <Badge
            variant={status === "connected" ? "default" : "secondary"}
            className={
              status === "connected"
                ? "bg-emerald-600 text-white"
                : "bg-amber-600 text-white"
            }
          >
            {status}
          </Badge>
        </div>
      </header>

      {/* Main Table Arena */}
      <div className="mt-8 grid flex-1 grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Trick Arena */}
        <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-2">
          {/* Phase Banner */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Phase
              </span>
              <h2 className="text-2xl font-bold capitalize text-slate-100">
                {v?.phase === "bidding"
                  ? "Bidding in Progress"
                  : v?.phase || "Waiting..."}
              </h2>
            </div>
            {v && (
              <div className="text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Round
                </span>
                <p className="text-2xl font-bold font-mono text-amber-400">
                  {v.roundIndex + 1} ({v.handSize} cards)
                </p>
              </div>
            )}
          </div>

          {/* Current Trick Arena */}
          <div className="flex flex-1 flex-col items-center justify-center py-10">
            {v?.phase === "bidding" ? (
              <div className="text-center py-12">
                <p className="text-xl font-medium text-slate-300">
                  Players are placing their bids...
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  {v.handCounts.map((_count, i) => (
                    <div
                      key={`bidding-player-${i}`}
                      className="flex flex-col items-center rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3"
                    >
                      <span className="text-xs text-slate-400">
                        Player {i + 1}
                      </span>
                      <span className="mt-1 font-mono text-lg font-bold">
                        {v.bids?.[i] !== null && v.bids?.[i] !== undefined
                          ? "Bid Placed"
                          : "Thinking..."}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : v?.currentTrick && v.currentTrick.length > 0 ? (
              <div className="w-full">
                <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">
                  Current Trick
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {v.currentTrick.map((p, i) => (
                    <div
                      key={`play-${p.playerIndex}-${i}`}
                      className="flex flex-col items-center gap-2"
                    >
                      <span className="text-sm font-bold text-slate-300">
                        Player {p.playerIndex + 1}
                      </span>
                      <div className="relative overflow-hidden rounded-xl shadow-2xl transition-transform hover:scale-105">
                        <CardImage
                          card={parseCardId(p.card.id)}
                          width={140}
                          height={196}
                          className="h-48 w-auto rounded-xl object-contain sm:h-56"
                        />
                      </div>
                      {p.tigressMode && (
                        <Badge variant="outline" className="text-xs uppercase">
                          as {p.tigressMode}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12">
                <p className="text-xl">Waiting for lead card...</p>
                {v && (
                  <p className="mt-2 text-sm text-slate-400">
                    Leader: Player {v.trickLeaderIndex + 1}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Cards remaining in hands */}
          {v && (
            <div className="mt-auto border-t border-slate-800 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Cards Remaining in Hands
              </span>
              <div className="mt-2 flex flex-wrap gap-4">
                {v.handCounts.map((count, i) => (
                  <div
                    key={`hand-count-${i}`}
                    className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-1.5 text-sm"
                  >
                    <span className="text-slate-400">Player {i + 1}:</span>
                    <span className="font-bold text-amber-300">
                      {count} cards
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Standings & Scores */}
        <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-4">
            Leaderboard & Round Stats
          </h2>

          <div className="mt-4 flex-1">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                  <th className="py-3 font-semibold">Player</th>
                  <th className="py-3 font-semibold text-center">Bid</th>
                  <th className="py-3 font-semibold text-center">Won</th>
                  <th className="py-3 font-semibold text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {v?.cumulativeScores.map((score, i) => (
                  <tr key={`standings-${i}`} className="hover:bg-slate-800/30">
                    <td className="py-4 font-bold text-slate-200">
                      Player {i + 1}
                      {v.trickLeaderIndex === i && (
                        <span className="ml-2 text-xs font-normal text-amber-400">
                          ★ Lead
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-center font-mono font-bold text-slate-300">
                      {v.bids?.[i] !== null && v.bids?.[i] !== undefined
                        ? v.bids[i]
                        : "-"}
                    </td>
                    <td className="py-4 text-center font-mono font-bold text-slate-300">
                      {v.tricksWon?.[i] ?? 0}
                    </td>
                    <td className="py-4 text-right font-mono text-xl font-black text-amber-400">
                      {score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Completed Tricks in Round */}
            {v && v.completedTricks.length > 0 && (
              <div className="mt-8 border-t border-slate-800 pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Completed Tricks This Round ({v.completedTricks.length}/
                  {v.handSize})
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {v.completedTricks.map((t, idx) => (
                    <Badge
                      key={`completed-trick-${idx}`}
                      variant="outline"
                      className="border-slate-700 bg-slate-800 text-slate-300 text-xs py-1 px-2.5"
                    >
                      T{idx + 1}:{" "}
                      {t.outcome.type === "won"
                        ? `P${(t.outcome.winnerIndex ?? 0) + 1}`
                        : t.outcome.type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
