"use client";

import { BookOpen, Calculator, Sparkles, Swords } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const tiles = [
  {
    href: "/games/skull-king/play",
    title: "Play",
    description:
      "Join or host synchronized matches across phones with a 2-letter room code.",
    icon: Swords,
    badge: "Interactive",
    cta: "Play",
  },
  {
    href: "/games/skull-king/calculator",
    title: "Score Calculator",
    description:
      "Track bids, tricks, pirate abilities, and bonuses on a single device.",
    icon: Calculator,
    badge: "Single Device",
    cta: "Open Calculator",
  },
  {
    href: "/games/skull-king/docs",
    title: "Rules & Docs",
    description:
      "Illustrated official rules, scoring breakdown, and character ability guide.",
    icon: BookOpen,
    badge: "Reference",
    cta: "Read Rules",
  },
] as const;

export function SkullKingHubClient() {
  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-2 max-w-prose text-left">
        <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          <Sparkles className="size-3" />
          <span>Pirate Card Game</span>
        </div>
        <h2 className="font-headline text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Skull <span className="text-primary">King</span>
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Trick-taking on the high seas. Pick how you want to play tonight:
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card
              key={tile.href}
              className="group flex flex-col justify-between gap-0 overflow-hidden py-0 border-border/80 bg-card transition-all hover:border-primary/50 hover:shadow-[0_4px_20px_rgba(245,158,11,0.1)]"
            >
              <CardHeader className="border-b border-border/70 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <span className="rounded-full border border-border/80 bg-muted/60 px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                    {tile.badge}
                  </span>
                </div>
                <CardTitle className="mt-2 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {tile.title}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                  {tile.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <Button variant="branded" className="w-full" asChild>
                  <Link href={tile.href}>{tile.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
