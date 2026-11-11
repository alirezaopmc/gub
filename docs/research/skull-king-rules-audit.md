# Skull King rules audit (2026-11-11)

Goal: confirm every GUB rule against at least two independent sources before the Go rewrite.

Sources:

- **S1** Grandpa Beck's official rulebook (2012/2021), `sk_rulebook_optimized.pdf`, fully read.
- **S2** Board Game Arena help page, <https://en.doc.boardgamearena.com/Gamehelpskullking>.
- **S3** <https://gamerules.com/rules/skull-king/> (secondary; contains errors, see Kraken).
- **S4** BGA forum thread on Kraken + White Whale, <https://forum.boardgamearena.com/viewtopic.php?p=223565>.
- Not reached: the publisher's FAQ page (HTTP 429). Retry before finalising.

## Verdicts

| Topic | GUB docs/engine | Sources | Verdict |
|---|---|---|---|
| Deck: 56 suited + 14 specials = 70; +Kraken, Whale, 2 Loot = 74 | 70 / 74 | S1, S2, S3 agree | OK |
| Player count | docs say 3–8 | S1, S3: 2–8 (2-player uses Graybeard's ghost, S1 p.21) | Docs incomplete; 2p is a product decision |
| Dealing: n cards in round n, deck reshuffled every round, dealer rotates left, left of dealer leads trick 1 | matches | S1, S2, S3 | OK |
| 7–8 players | cap at floor(deck/players) | S1: repeat the max equal hand in final rounds | OK. Note 7 players x 10 cards uses all 70 cards, so no undealt cards for Bendt/Juanita in base deck |
| Bidding is simultaneous, bids above 5 spoken aloud | matches | S1, S2 | OK |
| Follow suit; specials always playable | matches | S1, S2, S3 | OK |
| Lead Escape / Tigress-as-Escape / Loot: next player sets suit; if they also play one of these, setting defers | matches | S1 p.12, S2 | OK |
| Lead Pirate / Mermaid / SK / Tigress-as-Pirate / Kraken / Whale: no suit | matches | S1, S2 | OK |
| Hierarchy; same type first-played wins; Pirate+SK+Mermaid -> Mermaid | matches | S1, S2, S3 | OK |
| All-escape trick: first card wins | docs say "first Escape"; S1 says the first card among Escape, Tigress-as-Escape or Loot | S1 | Docs wording wrong (minor) |
| Bid scoring: +20/trick; -10 per trick off; zero bid +/-10 x cards dealt | matches | S1, S2, S3 | OK |
| 14 bonus: +10 standard, +20 black, for 14s in tricks you win, whoever played them | matches | S1 p.16, S2 | OK |
| Captures: +20 per Mermaid taken by Pirate; +30 per Pirate taken by SK; +40 SK taken by Mermaid. "Each" is plural | docs say each; **engine awards one capture per trick** | S1, S2 | **Engine bug** (SK takes 3 Pirates = +90, engine gives +30) |
| Bonuses only with correct bid | matches | S1, S2 | OK |
| **Rascal wager lost on a missed bid** | docs/engine: bonus forfeited, no penalty; ability page says "-wager" | S1 p.26: "lose them if you fail"; S2: "lose them if you don't" | **Docs self-contradict; engine wrong** (should be -wager) |
| Kraken: trick destroyed; player who **would have won** leads | docs OK | S1 p.23, S2 agree; S3 says player left of Kraken leads | S3 is wrong, docs OK |
| Whale: specials become Escapes, highest number wins regardless of suit, ties first played, only specials -> discarded and **Whale player leads** | docs say Whale player leads; **engine uses would-be winner** for the discarded case | S1 p.24, S2, S3 | **Engine bug** |
| Kraken + Whale: second played applies | matches | S1 p.24, S2, S3, S4 | OK |
| Loot: alliance between the player who played it and the player who captures it; both bid right -> +20 each; lead Loot + all Escapes -> Loot player wins, no alliance | docs say "you may form" | S1 p.25, S2 | Docs wording wrong (automatic, not optional) |
| Pirate abilities: win with that Pirate, use immediately; only Harry after final trick | matches | S1 p.26, S2 | OK |
| Round presets | docs cite "page 14" | S1 p.27 (not 14) | Page ref wrong; presets match |
| **Rascal's Scoring** (alternative system: Direct Hit / Glancing Blow / Complete Miss, 10 x cards dealt potential; Cannonball/Grapeshot) | absent everywhere | S1 pp.18-20 | **Missing** |
| Two-player Graybeard rules | absent | S1 p.21 | Missing |
| Ties | "shared victory" | S2 | OK (S1 silent) |

## Follow-up research on the open points

Sources added: the publisher FAQ, <https://www.grandpabecksgames.com/pages/skull-king> (reached only through search excerpts; direct fetch returned HTTP 429), and BGG threads (all returned HTTP 403, so only search excerpts were seen): "Kraken - who leads next?", "Who leads after Kraken?", "White Whale vs Kraken", "special card lead suit rule", "Setting the suit after a special", "Handling Multiple Captures".

| # | Question | Evidence | Status | Decision for GUB |
|---|---|---|---|---|
| 1 | Whale played, only specials | S1 p.24 (Whale player leads). Publisher FAQ example: Kraken after Whale -> second one wins, the first acts as an Escape, and the player who would have won "had neither creature been played" leads. S4 players agree nobody wins | **Confirmed** | Kraken last: would-be winner leads (ignore both creatures). Whale last, only specials: Whale player leads. Fix engine |
| 2 | Kraken print discrepancy | Publisher FAQ: one print run's rulebook and player aids disagree. A BGG thread reports "left of the Kraken player". S3 copied that wrong text | **Explained** | Would-be winner leads (S1 online, S2, FAQ) |
| 3 | Escape led, then a Pirate/Mermaid/SK | Publisher FAQ: Loot or Escape lead -> "no assigned suit, the next player chooses". S1: next player sets it "unless they play one of these", which defers. S2: unnumbered cards are not suit cards. No source covers a character as the second card | **Open, no ruling found** | Characters never set a suit; the first suited card after the Escape sets it. This keeps the existing engine behaviour. Expose as a rule flag |
| 4 | Two Loot cards in one trick | No source | **Open, no ruling found** | Each Loot card forms its own alliance with the trick winner; a Loot played by the winner forms none. Engine today handles only the first Loot. Fix and flag |
| 5 | Kraken/Whale played mid-trick: do later players still follow suit? | S1/S2 only say that a *leading* Kraken/Whale has no suit. Nothing says a mid-trick one lifts the obligation | **Open, no ruling found** | The lead suit is unchanged. Engine currently lifts follow-suit after any Kraken/Whale; remove that. Flag if the owner disagrees |
| 6 | Fourteens in a destroyed trick | S1: Kraken trick cards are "set aside" | Confirmed | Nobody collects them (engine already does this) |

Items 3 to 5 are house rules until the publisher answers. Contact: the rulebook lists Grandpa@grandpabecksgames.com.
