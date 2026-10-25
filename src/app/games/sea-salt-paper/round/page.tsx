import type { Metadata } from "next";
import { SeaSaltRoundScorer } from "@/components/games/sea-salt-paper/round-scorer";

export const metadata: Metadata = {
  title: "Round Companion — Sea Salt & Paper | GUB",
  description:
    "Multiplayer tableside round score keeper and running leaderboard for Sea Salt & Paper.",
};

export default function SeaSaltRoundPage() {
  return <SeaSaltRoundScorer />;
}
