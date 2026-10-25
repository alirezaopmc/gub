import type { Metadata } from "next";
import { ScoutCalculatorView } from "@/components/games/scout/calculator-view";

export const metadata: Metadata = {
  title: "Scout Calculator | GUB",
  description: "Instant Scout card game scoring calculator for physical play.",
};

export default function ScoutCalculatorPage() {
  return <ScoutCalculatorView />;
}
