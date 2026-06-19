import Link from "next/link"

import { ROUNDS_SCHEMA_PRESETS } from "@/lib/games/skull-king/rounds-schema"

const sections = [
  { id: "overview", title: "Overview" },
  { id: "setup", title: "Setup & deck" },
  { id: "bidding", title: "Bidding" },
  { id: "playing", title: "Playing tricks" },
  { id: "cards", title: "Card ranks" },
  { id: "leading", title: "Leading specials" },
  { id: "scoring", title: "Scoring" },
  { id: "advanced", title: "Advanced cards" },
  { id: "presets", title: "Round presets" },
  { id: "app", title: "This app" },
] as const

export function SkullKingDocsView() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="font-headline text-3xl font-semibold text-primary">Skull King rules</h1>
      <p className="text-muted-foreground">
        Based on the Grandpa Beck&apos;s rulebook.{" "}
        <a href="https://en.doc.boardgamearena.com/Gamehelpskullking" className="text-secondary">
          BGA FAQ
        </a>{" "}
        aligned where noted.
      </p>

      <nav className="not-prose my-8 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-border px-3 py-1 text-muted-foreground hover:text-foreground"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <section id="overview">
        <h2>Overview</h2>
        <p>
          Skull King is a trick-taking game over multiple rounds. Each round players bid how many tricks
          they will win, then play cards in tricks. Correct bids score points; misses lose points. Highest
          total wins.
        </p>
      </section>

      <section id="setup">
        <h2>Setup &amp; deck</h2>
        <ul>
          <li>4 suits numbered 1–14: green, yellow, purple, black (trump).</li>
          <li>5 Escape, 5 Pirates, 1 Tigress, 1 Skull King, 2 Mermaids.</li>
          <li>Advanced (optional): 2 Loot, 1 Kraken, 1 White Whale.</li>
          <li>Base deck: 70 cards. With all advanced: 74.</li>
          <li>Round <em>n</em> normally deals <em>n</em> cards; cap when deck cannot deal full count (e.g. 8 players rounds 9–10 deal 8).</li>
        </ul>
      </section>

      <section id="bidding">
        <h2>Bidding</h2>
        <p>Each player bids 0 through hand size. Bids above 5 are spoken aloud at the table.</p>
      </section>

      <section id="playing">
        <h2>Playing tricks</h2>
        <ul>
          <li>Leader plays any card. Play continues clockwise.</li>
          <li>If a suited card leads, you must follow that suit when you hold it.</li>
          <li>Special cards may always be played, even when you could follow suit.</li>
          <li>You cannot play black trump if you hold the led standard suit.</li>
          <li>Trick winner leads next trick.</li>
        </ul>
      </section>

      <section id="cards">
        <h2>Card ranks</h2>
        <ul>
          <li>Suited: highest of lead suit wins; black trumps other suits.</li>
          <li>Pirate beats all suited; ties → first played wins.</li>
          <li>Skull King beats suited and pirates.</li>
          <li>Mermaid beats Skull King and suited; loses to Pirate.</li>
          <li>Pirate + Skull King + Mermaid in one trick → Mermaid wins; only Mermaid→King bonus applies.</li>
          <li>Escape always loses; all escapes → first escape wins.</li>
          <li>Tigress: declare Pirate or Escape when played.</li>
        </ul>
      </section>

      <section id="leading">
        <h2>Leading specials</h2>
        <ul>
          <li>Escape / Tigress-as-Escape / Loot lead → next suited card sets follow suit.</li>
          <li>Mermaid, Pirate, Skull King, Tigress-as-Pirate, Kraken, Whale lead → no follow suit.</li>
        </ul>
      </section>

      <section id="scoring">
        <h2>Scoring (default)</h2>
        <ul>
          <li>Bid ≥1 exact: +20 per trick bid.</li>
          <li>Miss: −10 per trick off.</li>
          <li>Bid 0 exact: +10 × cards dealt.</li>
          <li>Bid 0 miss: −10 × cards dealt.</li>
          <li>Bonuses only if bid correct: 14s (+10 standard, +20 black), captures (+20/+30/+40).</li>
          <li>Loot alliance: +20 each if both allies make bid.</li>
        </ul>
      </section>

      <section id="advanced">
        <h2>Advanced cards &amp; pirate abilities</h2>
        <ul>
          <li>Kraken: trick destroyed; would-be winner leads.</li>
          <li>White Whale: specials stripped; highest number wins.</li>
          <li>Kraken + Whale same trick → second played wins.</li>
          <li>Pirate abilities when enabled — win trick with your pirate (not capture).</li>
        </ul>
      </section>

      <section id="presets">
        <h2>Round presets</h2>
        <ul>
          <li>Default: {ROUNDS_SCHEMA_PRESETS.default.join(", ")}</li>
          <li>Even Keeled: {ROUNDS_SCHEMA_PRESETS.evenKeeled.join(", ")}</li>
          <li>Whirlpool: {ROUNDS_SCHEMA_PRESETS.whirlpool.join(", ")}</li>
          <li>Swift Skirmish: {ROUNDS_SCHEMA_PRESETS.swiftSkirmish.join(", ")}</li>
        </ul>
      </section>

      <section id="app">
        <h2>This app</h2>
        <ul>
          <li>
            <Link href="/games/skull-king/play">Play</Link> — live 3–8 player matches, 2-letter join codes.
          </li>
          <li>
            <Link href="/games/skull-king/calculator">Score Calculator</Link> — single-device scoring.
          </li>
          <li>Ties end in shared victory (no extra round).</li>
          <li>Matches are in-memory on the server until a persistent API ships.</li>
        </ul>
      </section>
    </article>
  )
}
