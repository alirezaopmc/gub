import type { Metadata } from "next";
import { SeaSaltCalculatorView } from "@/components/games/sea-salt-paper/calculator-view";

export const metadata: Metadata = {
  title: "Hand Calculator — Sea Salt & Paper | GUB",
  description:
    "Instant hand combination and points calculator for Sea Salt & Paper.",
};

export default function SeaSaltCalculatorPage() {
  return <SeaSaltCalculatorView />;
}
