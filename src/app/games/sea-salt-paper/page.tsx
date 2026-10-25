import type { Metadata } from "next";
import { SeaSaltHub } from "@/components/games/sea-salt-paper/sea-salt-hub";

export const metadata: Metadata = {
  title: "Sea Salt & Paper | GUB",
  description:
    "Sea Salt & Paper card game tableside scoring companion, instant hand calculator, and rules.",
};

export default function SeaSaltPage() {
  return <SeaSaltHub />;
}
