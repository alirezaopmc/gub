import type { Metadata } from "next";
import { ScoutRoundScorer } from "@/components/games/scout/round-scorer";

export const metadata: Metadata = {
  title: "Scout Round Companion | GUB",
  description:
    "Tableside scorekeeper and running leaderboard for Scout card games.",
};

export default function ScoutRoundPage() {
  return <ScoutRoundScorer />;
}
