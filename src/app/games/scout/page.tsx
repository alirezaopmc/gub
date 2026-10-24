import type { Metadata } from "next";
import { ScoutHub } from "@/components/games/scout/scout-hub";

export const metadata: Metadata = {
  title: "Scout | GUB",
  description:
    "Scout card game tableside scoring companion, instant calculator, and rules.",
};

export default function ScoutPage() {
  return <ScoutHub />;
}
