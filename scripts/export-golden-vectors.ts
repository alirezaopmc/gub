import * as fs from "node:fs";
import * as path from "node:path";
import { createCard } from "../src/lib/games/skull-king/engine/cards";
import { resolveLeadContext } from "../src/lib/games/skull-king/engine/lead-suit";
import { getLegalCards } from "../src/lib/games/skull-king/engine/legal-moves";
import {
  advanceRound,
  applyAbility,
  applyBid,
  applyPlayCard,
  confirmRound,
  createMatchState,
  defaultMatchConfig,
  startMatch,
  startRound,
} from "../src/lib/games/skull-king/engine/match-reducer";
import { resolveTrick } from "../src/lib/games/skull-king/engine/trick-resolution";
import type {
  Card,
  MatchConfig,
  MatchState,
  PlayedCard,
  RuleFlags,
  StandardSuit,
  TigressMode,
  TrickResult,
} from "../src/lib/games/skull-king/engine/types";
import { computeRoundScoreBreakdown } from "../src/lib/games/skull-king/round-score/score-rules";
import type {
  PlayerRoundData,
  RoundEvent,
  ScoringSystem,
} from "../src/lib/games/skull-king/round-score/types";

const OUT_DIR = path.resolve(__dirname, "../testdata/skull-king");

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
}

// -------------------------------------------------------------
// 1. TRICKS GOLDEN VECTORS
// -------------------------------------------------------------

type TrickCase = {
  id: string;
  name: string;
  ruleFlags: RuleFlags;
  playerCount: number;
  plays: PlayedCard[];
  expected: {
    leadSuit: StandardSuit | null;
    outcome: TrickResult["outcome"];
    captures: TrickResult["captures"];
    lootAlliances: TrickResult["lootAlliances"];
    nextLeader: number;
  };
};

function makePlay(
  card: Card,
  playerIndex: number,
  order: number,
  tigressMode?: TigressMode,
): PlayedCard {
  return { card, playerIndex, playOrder: order, tigressMode };
}

function generateTrickCases(): TrickCase[] {
  const cases: TrickCase[] = [];
  let seq = 1;

  function addCase(
    name: string,
    plays: PlayedCard[],
    flags: RuleFlags = { escapeLeadDefersThroughCharacters: false },
    playerCount: number = plays.length,
  ) {
    const leadCtx = resolveLeadContext(plays, flags);
    const result = resolveTrick(plays, playerCount, flags);
    let nextLeader = 0;
    if (result.outcome.type === "won") {
      nextLeader = result.outcome.winnerIndex;
    } else {
      nextLeader = result.outcome.wouldBeWinnerIndex;
    }

    cases.push({
      id: `trick_${String(seq++).padStart(4, "0")}`,
      name,
      ruleFlags: flags,
      playerCount,
      plays,
      expected: {
        leadSuit: leadCtx.leadSuit,
        outcome: result.outcome,
        captures: result.captures,
        lootAlliances: result.lootAlliances ?? [],
        nextLeader,
      },
    });
  }

  const suits: StandardSuit[] = ["green", "yellow", "purple", "black"];

  // 1. Basic Suited Tricks (all suits, high card wins, first played wins on tie if different suit)
  for (const s of suits) {
    for (let rank = 1; rank <= 14; rank++) {
      const lower = rank > 1 ? rank - 1 : 14;
      addCase(`Suited lead ${s} ${rank} vs lower ${lower}`, [
        makePlay(createCard({ kind: "suited", suit: s, rank }), 0, 0),
        makePlay(createCard({ kind: "suited", suit: s, rank: lower }), 1, 1),
      ]);
    }
  }

  // 2. Multi-player suited tricks (3, 4, 5, 6 players)
  for (let p = 3; p <= 6; p++) {
    const plays = Array.from({ length: p }, (_, i) =>
      makePlay(
        createCard({ kind: "suited", suit: "green", rank: i + 3 }),
        i,
        i,
      ),
    );
    addCase(`${p}-player green suited trick`, plays);
  }

  // 3. Off-suit discards vs Trump (black)
  for (const lead of ["green", "yellow", "purple"] as StandardSuit[]) {
    // Lead suit vs off-suit non-trump
    addCase(
      `${lead} lead beaten by higher ${lead}, off-suit purple discarded`,
      [
        makePlay(createCard({ kind: "suited", suit: lead, rank: 5 }), 0, 0),
        makePlay(createCard({ kind: "suited", suit: lead, rank: 10 }), 1, 1),
        makePlay(
          createCard({
            kind: "suited",
            suit: lead === "yellow" ? "green" : "yellow",
            rank: 14,
          }),
          2,
          2,
        ),
      ],
    );

    // Lead suit vs black trump
    for (let trumpRank = 1; trumpRank <= 14; trumpRank += 3) {
      addCase(`${lead} 14 trumped by black ${trumpRank}`, [
        makePlay(createCard({ kind: "suited", suit: lead, rank: 14 }), 0, 0),
        makePlay(
          createCard({ kind: "suited", suit: "black", rank: trumpRank }),
          1,
          1,
        ),
        makePlay(createCard({ kind: "suited", suit: lead, rank: 2 }), 2, 2),
      ]);
    }
  }

  // 4. Black trump vs Black trump
  addCase("Black trump 5 vs Black trump 12", [
    makePlay(createCard({ kind: "suited", suit: "black", rank: 5 }), 0, 0),
    makePlay(createCard({ kind: "suited", suit: "black", rank: 12 }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "black", rank: 8 }), 2, 2),
  ]);

  // 5. Escapes
  // All escapes: first card played wins
  for (let p = 2; p <= 6; p++) {
    const plays = Array.from({ length: p }, (_, i) =>
      makePlay(createCard({ kind: "escape", index: i }), i, i),
    );
    addCase(`All ${p} players play Escape - first played wins`, plays);
  }

  // Escape lead, followed by suited
  addCase("Escape lead then green 8 and green 12", [
    makePlay(createCard({ kind: "escape", index: 0 }), 0, 0),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 8 }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 12 }), 2, 2),
  ]);

  // Multiple escapes lead, then suited
  addCase("Two escapes lead then yellow 10", [
    makePlay(createCard({ kind: "escape", index: 0 }), 0, 0),
    makePlay(createCard({ kind: "escape", index: 1 }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "yellow", rank: 10 }), 2, 2),
    makePlay(createCard({ kind: "suited", suit: "yellow", rank: 4 }), 3, 3),
  ]);

  // Tigress as escape vs Tigress as pirate
  addCase("Tigress as escape leads, then green 10", [
    makePlay(createCard({ kind: "tigress" }), 0, 0, "escape"),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 10 }), 1, 1),
  ]);

  addCase("Tigress as pirate leads, beats green 14", [
    makePlay(createCard({ kind: "tigress" }), 0, 0, "pirate"),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 1, 1),
  ]);

  // 6. Character Lead vs Deferral flag
  const characters: Card[] = [
    createCard({ kind: "pirate", pirate: "rosie" }),
    createCard({ kind: "mermaid", mermaid: "alyra" }),
    createCard({ kind: "skull_king" }),
  ];

  for (const c of characters) {
    // With flag false (default): escape lead then character -> character does not defer, no lead suit
    addCase(
      `Escape lead then ${c.def.kind} then purple 10 (defers=false)`,
      [
        makePlay(createCard({ kind: "escape", index: 0 }), 0, 0),
        makePlay(c, 1, 1),
        makePlay(
          createCard({ kind: "suited", suit: "purple", rank: 10 }),
          2,
          2,
        ),
      ],
      { escapeLeadDefersThroughCharacters: false },
    );

    // With flag true: escape lead then character then purple 10 -> purple sets lead suit
    addCase(
      `Escape lead then ${c.def.kind} then purple 10 (defers=true)`,
      [
        makePlay(createCard({ kind: "escape", index: 0 }), 0, 0),
        makePlay(c, 1, 1),
        makePlay(
          createCard({ kind: "suited", suit: "purple", rank: 10 }),
          2,
          2,
        ),
      ],
      { escapeLeadDefersThroughCharacters: true },
    );
  }

  // 7. Pirates vs Suited/Black
  const pirates: Card[] = [
    createCard({ kind: "pirate", pirate: "rosie" }),
    createCard({ kind: "pirate", pirate: "bendt" }),
    createCard({ kind: "pirate", pirate: "rascal" }),
    createCard({ kind: "pirate", pirate: "juanita" }),
    createCard({ kind: "pirate", pirate: "harry" }),
  ];

  for (let i = 0; i < pirates.length; i++) {
    addCase(`Pirate ${i + 1} beats black 14 and green 14`, [
      makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 0, 0),
      makePlay(createCard({ kind: "suited", suit: "black", rank: 14 }), 1, 1),
      makePlay(pirates[i]!, 2, 2),
    ]);
  }

  // First pirate wins against second pirate
  addCase("First pirate beats second pirate", [
    makePlay(pirates[0]!, 0, 0),
    makePlay(pirates[1]!, 1, 1),
    makePlay(createCard({ kind: "suited", suit: "black", rank: 14 }), 2, 2),
  ]);

  // 8. Skull King vs Pirates (Single and Multiple Captures: +30N)
  addCase("Skull King captures 1 Pirate (+30)", [
    makePlay(pirates[0]!, 0, 0),
    makePlay(createCard({ kind: "skull_king" }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "black", rank: 14 }), 2, 2),
  ]);

  addCase("Skull King captures 2 Pirates (+60)", [
    makePlay(pirates[0]!, 0, 0),
    makePlay(pirates[1]!, 1, 1),
    makePlay(createCard({ kind: "skull_king" }), 2, 2),
  ]);

  addCase("Skull King captures 3 Pirates (+90)", [
    makePlay(pirates[0]!, 0, 0),
    makePlay(pirates[1]!, 1, 1),
    makePlay(pirates[2]!, 2, 2),
    makePlay(createCard({ kind: "skull_king" }), 3, 3),
  ]);

  addCase("Skull King captures 4 Pirates (+120)", [
    makePlay(pirates[0]!, 0, 0),
    makePlay(pirates[1]!, 1, 1),
    makePlay(pirates[2]!, 2, 2),
    makePlay(pirates[3]!, 3, 3),
    makePlay(createCard({ kind: "skull_king" }), 4, 4),
  ]);

  addCase("Skull King captures 5 Pirates (+150)", [
    makePlay(pirates[0]!, 0, 0),
    makePlay(pirates[1]!, 1, 1),
    makePlay(pirates[2]!, 2, 2),
    makePlay(pirates[3]!, 3, 3),
    makePlay(pirates[4]!, 4, 4),
    makePlay(createCard({ kind: "skull_king" }), 5, 5),
  ]);

  addCase("Skull King captures Tigress as pirate (+30)", [
    makePlay(createCard({ kind: "tigress" }), 0, 0, "pirate"),
    makePlay(createCard({ kind: "skull_king" }), 1, 1),
  ]);

  // 9. Mermaids vs Skull King & Pirates
  const mermaids: Card[] = [
    createCard({ kind: "mermaid", mermaid: "alyra" }),
    createCard({ kind: "mermaid", mermaid: "sirena" }),
  ];

  // Mermaid beats Skull King (+40)
  addCase("Mermaid captures Skull King (+40)", [
    makePlay(createCard({ kind: "skull_king" }), 0, 0),
    makePlay(mermaids[0]!, 1, 1),
  ]);

  // Multiple Mermaids vs Skull King (first mermaid wins, +40)
  addCase("First Mermaid captures Skull King with second Mermaid present", [
    makePlay(createCard({ kind: "skull_king" }), 0, 0),
    makePlay(mermaids[0]!, 1, 1),
    makePlay(mermaids[1]!, 2, 2),
  ]);

  // Pirate captures 1 Mermaid (+20)
  addCase("Pirate captures 1 Mermaid (+20)", [
    makePlay(mermaids[0]!, 0, 0),
    makePlay(pirates[0]!, 1, 1),
  ]);

  // Pirate captures 2 Mermaids (+40)
  addCase("Pirate captures 2 Mermaids (+40)", [
    makePlay(mermaids[0]!, 0, 0),
    makePlay(mermaids[1]!, 1, 1),
    makePlay(pirates[0]!, 2, 2),
  ]);

  // Tigress as pirate captures Mermaid (+20)
  addCase("Tigress as pirate captures Mermaid (+20)", [
    makePlay(mermaids[0]!, 0, 0),
    makePlay(createCard({ kind: "tigress" }), 1, 1, "pirate"),
  ]);

  // Mermaid + Pirate + Skull King triangular hierarchy: Mermaid wins!
  addCase(
    "Mermaid + Pirate + Skull King: Mermaid wins, captures Skull King (+40)",
    [
      makePlay(pirates[0]!, 0, 0),
      makePlay(createCard({ kind: "skull_king" }), 1, 1),
      makePlay(mermaids[0]!, 2, 2),
    ],
  );

  addCase("Skull King + Mermaid + Pirate order variations", [
    makePlay(createCard({ kind: "skull_king" }), 0, 0),
    makePlay(pirates[0]!, 1, 1),
    makePlay(mermaids[0]!, 2, 2),
  ]);

  addCase("Mermaid + Skull King + 3 Pirates: Mermaid wins (+40)", [
    makePlay(pirates[0]!, 0, 0),
    makePlay(pirates[1]!, 1, 1),
    makePlay(pirates[2]!, 2, 2),
    makePlay(createCard({ kind: "skull_king" }), 3, 3),
    makePlay(mermaids[0]!, 4, 4),
  ]);

  // 10. Loot & Alliances
  // Loot played by P0, won by P1 (alliance [0, 1])
  addCase("Single Loot captured by green 14 (alliance 0-1)", [
    makePlay(createCard({ kind: "loot", index: 0 }), 0, 0),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 5 }), 2, 2),
  ]);

  // Loot played by P1, won by P1 (no alliance)
  addCase("Single Loot won by player who played it (no alliance)", [
    makePlay(createCard({ kind: "suited", suit: "green", rank: 5 }), 0, 0),
    makePlay(createCard({ kind: "loot", index: 0 }), 1, 1),
    makePlay(createCard({ kind: "escape", index: 0 }), 2, 2),
  ]);

  // Two Loots played by P0 and P1, won by P2 (two alliances: [0, 2] and [1, 2])
  addCase("Two Loots captured by P2 (two alliances)", [
    makePlay(createCard({ kind: "loot", index: 0 }), 0, 0),
    makePlay(createCard({ kind: "loot", index: 1 }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "black", rank: 14 }), 2, 2),
  ]);

  // Two Loots played by P0 and P1, won by P0 (only 1 alliance: [1, 0])
  addCase("Two Loots, one played by winner P0 (one alliance)", [
    makePlay(createCard({ kind: "loot", index: 0 }), 0, 0),
    makePlay(createCard({ kind: "loot", index: 1 }), 1, 1),
    makePlay(createCard({ kind: "escape", index: 0 }), 2, 2),
  ]);

  // Loot lead + all escapes: Loot player wins, 0 alliances
  addCase("Loot lead with all Escapes: Loot player wins, no alliance", [
    makePlay(createCard({ kind: "loot", index: 0 }), 0, 0),
    makePlay(createCard({ kind: "escape", index: 0 }), 1, 1),
    makePlay(createCard({ kind: "escape", index: 1 }), 2, 2),
  ]);

  // 11. Kraken
  // Kraken destroys trick, would-be winner leads
  addCase("Kraken destroys trick, would-be green 14 leads", [
    makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 0, 0),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 10 }), 1, 1),
    makePlay(createCard({ kind: "kraken" }), 2, 2),
  ]);

  addCase("Kraken destroys trick, would-be Pirate leads", [
    makePlay(createCard({ kind: "suited", suit: "black", rank: 14 }), 0, 0),
    makePlay(pirates[0]!, 1, 1),
    makePlay(createCard({ kind: "kraken" }), 2, 2),
  ]);

  addCase("Kraken destroys trick with Skull King and Pirate", [
    makePlay(pirates[0]!, 0, 0),
    makePlay(createCard({ kind: "skull_king" }), 1, 1),
    makePlay(createCard({ kind: "kraken" }), 2, 2),
  ]);

  addCase("Kraken leads trick", [
    makePlay(createCard({ kind: "kraken" }), 0, 0),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 12 }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 8 }), 2, 2),
  ]);

  // 12. Whale
  // Whale turns specials to Escapes, highest number wins regardless of suit
  addCase("Whale turns Pirate to escape, green 13 beats yellow 10", [
    makePlay(createCard({ kind: "whale" }), 0, 0),
    makePlay(pirates[0]!, 1, 1),
    makePlay(createCard({ kind: "suited", suit: "yellow", rank: 10 }), 2, 2),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 13 }), 3, 3),
  ]);

  addCase(
    "Whale: highest number regardless of suit wins (green 14 beats black 10)",
    [
      makePlay(createCard({ kind: "whale" }), 0, 0),
      makePlay(createCard({ kind: "suited", suit: "black", rank: 10 }), 1, 1),
      makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 2, 2),
    ],
  );

  addCase("Whale tie: first played highest number wins", [
    makePlay(createCard({ kind: "whale" }), 0, 0),
    makePlay(createCard({ kind: "suited", suit: "yellow", rank: 12 }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 12 }), 2, 2),
  ]);

  // Whale + ONLY specials: discarded_whale, Whale player leads
  addCase("Whale + only specials: discarded, Whale player leads (P0)", [
    makePlay(createCard({ kind: "whale" }), 0, 0),
    makePlay(pirates[0]!, 1, 1),
    makePlay(mermaids[0]!, 2, 2),
    makePlay(createCard({ kind: "escape", index: 0 }), 3, 3),
  ]);

  addCase("Whale + only specials: Whale played at P2 leads", [
    makePlay(pirates[0]!, 0, 0),
    makePlay(createCard({ kind: "skull_king" }), 1, 1),
    makePlay(createCard({ kind: "whale" }), 2, 2),
  ]);

  // 13. Kraken + Whale interactions
  // Whale first, Kraken second: Kraken wins (destroyed, would-be winner had neither creature been played leads)
  addCase(
    "Whale first, Kraken second: Kraken destroys, would-be winner leads",
    [
      makePlay(createCard({ kind: "whale" }), 0, 0),
      makePlay(createCard({ kind: "kraken" }), 1, 1),
      makePlay(createCard({ kind: "suited", suit: "green", rank: 10 }), 2, 2),
      makePlay(pirates[0]!, 3, 3),
    ],
  );

  // Kraken first, Whale second: Whale wins (highest number wins)
  addCase("Kraken first, Whale second: Whale applies, highest number wins", [
    makePlay(createCard({ kind: "kraken" }), 0, 0),
    makePlay(createCard({ kind: "whale" }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "yellow", rank: 14 }), 2, 2),
    makePlay(pirates[0]!, 3, 3),
  ]);

  // Kraken first, Whale second, only specials: discarded and Whale player leads
  addCase(
    "Kraken first, Whale second, only specials: Whale player leads (P1)",
    [
      makePlay(createCard({ kind: "kraken" }), 0, 0),
      makePlay(createCard({ kind: "whale" }), 1, 1),
      makePlay(pirates[0]!, 2, 2),
    ],
  );

  // 14. Additional systematic permutations to reach >= 220 cases
  for (let rank = 1; rank <= 14; rank++) {
    // Lead yellow rank vs black 1..14
    addCase(`Yellow ${rank} vs Black 1 vs Blue 14`, [
      makePlay(createCard({ kind: "suited", suit: "yellow", rank }), 0, 0),
      makePlay(createCard({ kind: "suited", suit: "black", rank: 1 }), 1, 1),
      makePlay(createCard({ kind: "suited", suit: "purple", rank: 14 }), 2, 2),
    ]);
  }

  for (let rank = 1; rank <= 14; rank++) {
    // Mermaid vs Suited ranks
    addCase(`Mermaid vs Green ${rank} vs Escape`, [
      makePlay(createCard({ kind: "suited", suit: "green", rank }), 0, 0),
      makePlay(mermaids[0]!, 1, 1),
      makePlay(createCard({ kind: "escape", index: 0 }), 2, 2),
    ]);
  }

  for (let rank = 1; rank <= 14; rank++) {
    // Skull King vs Black rank
    addCase(`Skull King vs Black ${rank}`, [
      makePlay(createCard({ kind: "suited", suit: "black", rank }), 0, 0),
      makePlay(createCard({ kind: "skull_king" }), 1, 1),
    ]);
  }

  for (let pIdx = 0; pIdx < pirates.length; pIdx++) {
    for (let mIdx = 0; mIdx < mermaids.length; mIdx++) {
      addCase(`Pirate ${pIdx} vs Mermaid ${mIdx} in 4p trick`, [
        makePlay(createCard({ kind: "suited", suit: "green", rank: 5 }), 0, 0),
        makePlay(mermaids[mIdx]!, 1, 1),
        makePlay(pirates[pIdx]!, 2, 2),
        makePlay(createCard({ kind: "escape", index: 0 }), 3, 3),
      ]);
    }
  }

  // 15. More edge cases: 14 bonuses + captures in same trick
  addCase("Skull King takes Pirate with Green 14 and Black 14 present", [
    makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 0, 0),
    makePlay(createCard({ kind: "suited", suit: "black", rank: 14 }), 1, 1),
    makePlay(pirates[0]!, 2, 2),
    makePlay(createCard({ kind: "skull_king" }), 3, 3),
  ]);

  addCase("Mermaid takes Skull King with Green 14 and Pirate present", [
    makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 0, 0),
    makePlay(pirates[0]!, 1, 1),
    makePlay(createCard({ kind: "skull_king" }), 2, 2),
    makePlay(mermaids[0]!, 3, 3),
  ]);

  // 16. Two-player Graybeard ghost trick scenarios
  addCase(
    "2-player Graybeard: P0 green 10, P1 green 5, Graybeard ghost green 14",
    [
      makePlay(createCard({ kind: "suited", suit: "green", rank: 10 }), 0, 0),
      makePlay(createCard({ kind: "suited", suit: "green", rank: 5 }), 1, 1),
      makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 2, 2),
    ],
    undefined,
    3,
  );

  addCase(
    "2-player Graybeard: P0 green 10, P1 green 12, Graybeard ghost Escape",
    [
      makePlay(createCard({ kind: "suited", suit: "green", rank: 10 }), 0, 0),
      makePlay(createCard({ kind: "suited", suit: "green", rank: 12 }), 1, 1),
      makePlay(createCard({ kind: "escape", index: 0 }), 2, 2),
    ],
    undefined,
    3,
  );

  addCase(
    "2-player Graybeard: P0 Pirate, P1 Skull King, Graybeard ghost Mermaid",
    [
      makePlay(pirates[0]!, 0, 0),
      makePlay(createCard({ kind: "skull_king" }), 1, 1),
      makePlay(mermaids[0]!, 2, 2),
    ],
    undefined,
    3,
  );

  // 17. Loot with multi-card captures in same trick
  addCase("Loot + Pirate captures Mermaid (alliance formed + capture)", [
    makePlay(createCard({ kind: "loot", index: 0 }), 0, 0),
    makePlay(mermaids[0]!, 1, 1),
    makePlay(pirates[0]!, 2, 2),
  ]);

  addCase("Loot + Skull King captures 2 Pirates", [
    makePlay(createCard({ kind: "loot", index: 0 }), 0, 0),
    makePlay(pirates[0]!, 1, 1),
    makePlay(pirates[1]!, 2, 2),
    makePlay(createCard({ kind: "skull_king" }), 3, 3),
  ]);

  // 18. Additional 7-player and 8-player tricks
  for (let p = 7; p <= 8; p++) {
    const plays = Array.from({ length: p }, (_, i) =>
      makePlay(
        createCard({
          kind: "suited",
          suit: "yellow",
          rank: ((i * 2) % 14) + 1,
        }),
        i,
        i,
      ),
    );
    addCase(`${p}-player yellow suited trick`, plays);
  }

  // 19. Kraken with Loot and 14s
  addCase("Kraken destroys trick containing Loot and 14", [
    makePlay(createCard({ kind: "loot", index: 0 }), 0, 0),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 1, 1),
    makePlay(createCard({ kind: "kraken" }), 2, 2),
  ]);

  // 20. Whale with 14s and specials
  addCase("Whale: green 14 beats black 10 and yellow 12", [
    makePlay(createCard({ kind: "whale" }), 0, 0),
    makePlay(createCard({ kind: "suited", suit: "black", rank: 10 }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "yellow", rank: 12 }), 2, 2),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 3, 3),
  ]);

  addCase("Whale: yellow 14 ties green 14, yellow played first wins", [
    makePlay(createCard({ kind: "whale" }), 0, 0),
    makePlay(createCard({ kind: "suited", suit: "yellow", rank: 14 }), 1, 1),
    makePlay(createCard({ kind: "suited", suit: "green", rank: 14 }), 2, 2),
  ]);

  // 21. More 2p Graybeard ghost cards
  addCase(
    "2p Graybeard: P0 yellow 10, P1 yellow 14, Ghost yellow 7",
    [
      makePlay(createCard({ kind: "suited", suit: "yellow", rank: 10 }), 0, 0),
      makePlay(createCard({ kind: "suited", suit: "yellow", rank: 14 }), 1, 1),
      makePlay(createCard({ kind: "suited", suit: "yellow", rank: 7 }), 2, 2),
    ],
    undefined,
    3,
  );

  addCase(
    "2p Graybeard: P0 yellow 10, P1 yellow 8, Ghost black 2 (trump wins)",
    [
      makePlay(createCard({ kind: "suited", suit: "yellow", rank: 10 }), 0, 0),
      makePlay(createCard({ kind: "suited", suit: "yellow", rank: 8 }), 1, 1),
      makePlay(createCard({ kind: "suited", suit: "black", rank: 2 }), 2, 2),
    ],
    undefined,
    3,
  );

  addCase(
    "2p Graybeard: P0 yellow 10, P1 yellow 8, Ghost Pirate (Ghost leads next)",
    [
      makePlay(createCard({ kind: "suited", suit: "yellow", rank: 10 }), 0, 0),
      makePlay(createCard({ kind: "suited", suit: "yellow", rank: 8 }), 1, 1),
      makePlay(pirates[0]!, 2, 2),
    ],
    undefined,
    3,
  );

  addCase(
    "2p Graybeard: P0 Pirate, P1 yellow 8, Ghost Tigress (played as Escape, P0 wins)",
    [
      makePlay(pirates[0]!, 0, 0),
      makePlay(createCard({ kind: "suited", suit: "yellow", rank: 8 }), 1, 1),
      makePlay(createCard({ kind: "tigress" }), 2, 2, "escape"),
    ],
    undefined,
    3,
  );

  addCase(
    "2p Graybeard: P0 Mermaid, P1 yellow 8, Ghost Skull King (P0 captures SK +40)",
    [
      makePlay(mermaids[0]!, 0, 0),
      makePlay(createCard({ kind: "suited", suit: "yellow", rank: 8 }), 1, 1),
      makePlay(createCard({ kind: "skull_king" }), 2, 2),
    ],
    undefined,
    3,
  );

  return cases;
}

// -------------------------------------------------------------
// 2. LEGAL MOVES GOLDEN VECTORS
// -------------------------------------------------------------

type LegalMoveCase = {
  id: string;
  name: string;
  hand: Card[];
  trick: PlayedCard[];
  ruleFlags: RuleFlags;
  expectedLegalCardIds: string[];
};

function generateLegalMoveCases(): LegalMoveCase[] {
  const cases: LegalMoveCase[] = [];
  let seq = 1;

  function addCase(
    name: string,
    hand: Card[],
    trick: PlayedCard[],
    flags: RuleFlags = { escapeLeadDefersThroughCharacters: false },
  ) {
    const legal = getLegalCards(hand, trick, flags);
    cases.push({
      id: `legal_${String(seq++).padStart(4, "0")}`,
      name,
      hand,
      trick,
      ruleFlags: flags,
      expectedLegalCardIds: legal.map((c) => c.id),
    });
  }

  const sampleHand: Card[] = [
    createCard({ kind: "suited", suit: "green", rank: 5 }),
    createCard({ kind: "suited", suit: "green", rank: 12 }),
    createCard({ kind: "suited", suit: "yellow", rank: 8 }),
    createCard({ kind: "suited", suit: "black", rank: 14 }),
    createCard({ kind: "escape", index: 0 }),
    createCard({ kind: "pirate", pirate: "rosie" }),
    createCard({ kind: "tigress" }),
    createCard({ kind: "skull_king" }),
    createCard({ kind: "mermaid", mermaid: "alyra" }),
    createCard({ kind: "loot", index: 0 }),
    createCard({ kind: "kraken" }),
    createCard({ kind: "whale" }),
  ];

  // 1. Trick leader: any card legal
  addCase("Trick leader can play any card in hand", sampleHand, []);

  // 2. Green led: player has green in hand -> only green and specials legal (not yellow or black)
  addCase("Green led: player must follow green or play special", sampleHand, [
    makePlay(createCard({ kind: "suited", suit: "green", rank: 7 }), 0, 0),
  ]);

  // 3. Purple led: player has NO purple in hand -> all cards in hand legal
  addCase("Purple led: player has no purple, can play anything", sampleHand, [
    makePlay(createCard({ kind: "suited", suit: "purple", rank: 10 }), 0, 0),
  ]);

  // 4. Black led: player has black in hand -> black and specials legal
  addCase(
    "Black led: player has black in hand, must follow black or special",
    sampleHand,
    [makePlay(createCard({ kind: "suited", suit: "black", rank: 6 }), 0, 0)],
  );

  // 5. Escape led: next player can play anything
  addCase("Escape led: suit not set, can play anything", sampleHand, [
    makePlay(createCard({ kind: "escape", index: 1 }), 0, 0),
  ]);

  // 6. Escape led, then yellow led: player must follow yellow or special
  addCase(
    "Escape led then yellow 10: must follow yellow or special",
    sampleHand,
    [
      makePlay(createCard({ kind: "escape", index: 1 }), 0, 0),
      makePlay(createCard({ kind: "suited", suit: "yellow", rank: 10 }), 1, 1),
    ],
  );

  // 7. Mid-trick Kraken does NOT lift follow-suit obligation!
  addCase(
    "Green led then Kraken played: player holding green must STILL follow green or special",
    sampleHand,
    [
      makePlay(createCard({ kind: "suited", suit: "green", rank: 4 }), 0, 0),
      makePlay(createCard({ kind: "kraken" }), 1, 1),
    ],
  );

  // 8. Mid-trick Whale does NOT lift follow-suit obligation!
  addCase(
    "Green led then Whale played: player holding green must STILL follow green or special",
    sampleHand,
    [
      makePlay(createCard({ kind: "suited", suit: "green", rank: 4 }), 0, 0),
      makePlay(createCard({ kind: "whale" }), 1, 1),
    ],
  );

  // 9. Character lead (Pirate / Mermaid / SK): suit is NOT set, any card legal
  addCase("Pirate led: no suit set, can play anything", sampleHand, [
    makePlay(createCard({ kind: "pirate", pirate: "bendt" }), 0, 0),
  ]);

  // 10. Escape lead deferral flag cases
  addCase(
    "Escape led then Pirate: flag=false -> no suit set",
    sampleHand,
    [
      makePlay(createCard({ kind: "escape", index: 0 }), 0, 0),
      makePlay(createCard({ kind: "pirate", pirate: "bendt" }), 1, 1),
    ],
    { escapeLeadDefersThroughCharacters: false },
  );

  addCase(
    "Escape led then Pirate: flag=true -> no suit set yet",
    sampleHand,
    [
      makePlay(createCard({ kind: "escape", index: 0 }), 0, 0),
      makePlay(createCard({ kind: "pirate", pirate: "bendt" }), 1, 1),
    ],
    { escapeLeadDefersThroughCharacters: true },
  );

  addCase(
    "Escape led then Pirate then Green 10: flag=true -> must follow green",
    sampleHand,
    [
      makePlay(createCard({ kind: "escape", index: 0 }), 0, 0),
      makePlay(createCard({ kind: "pirate", pirate: "bendt" }), 1, 1),
      makePlay(createCard({ kind: "suited", suit: "green", rank: 10 }), 2, 2),
    ],
    { escapeLeadDefersThroughCharacters: true },
  );

  addCase(
    "Escape led then Pirate then Green 10: flag=false -> green did not set suit (pirate ended it)",
    sampleHand,
    [
      makePlay(createCard({ kind: "escape", index: 0 }), 0, 0),
      makePlay(createCard({ kind: "pirate", pirate: "bendt" }), 1, 1),
      makePlay(createCard({ kind: "suited", suit: "green", rank: 10 }), 2, 2),
    ],
    { escapeLeadDefersThroughCharacters: false },
  );

  // 11. Hand with only suited cards of one suit
  const onlyYellowHand: Card[] = [
    createCard({ kind: "suited", suit: "yellow", rank: 1 }),
    createCard({ kind: "suited", suit: "yellow", rank: 7 }),
    createCard({ kind: "suited", suit: "yellow", rank: 14 }),
  ];
  addCase(
    "Only yellow cards in hand, green led: can play any yellow",
    onlyYellowHand,
    [makePlay(createCard({ kind: "suited", suit: "green", rank: 10 }), 0, 0)],
  );
  addCase(
    "Only yellow cards in hand, yellow led: must play yellow",
    onlyYellowHand,
    [makePlay(createCard({ kind: "suited", suit: "yellow", rank: 10 }), 0, 0)],
  );

  // 12. Hand with only specials
  const onlySpecialsHand: Card[] = [
    createCard({ kind: "escape", index: 0 }),
    createCard({ kind: "pirate", pirate: "harry" }),
    createCard({ kind: "skull_king" }),
    createCard({ kind: "mermaid", mermaid: "sirena" }),
  ];
  addCase(
    "Only specials in hand, green led: all specials legal",
    onlySpecialsHand,
    [makePlay(createCard({ kind: "suited", suit: "green", rank: 10 }), 0, 0)],
  );

  return cases;
}

// -------------------------------------------------------------
// 3. SCORING GOLDEN VECTORS
// -------------------------------------------------------------

type ScoringCase = {
  id: string;
  name: string;
  handSize: number;
  playerIndex: number;
  scoringSystem: ScoringSystem;
  player: PlayerRoundData;
  roundPlayers: PlayerRoundData[];
  expected: {
    main: number;
    bonus: number;
    total: number;
  };
};

function generateScoringCases(): ScoringCase[] {
  const cases: ScoringCase[] = [];
  let seq = 1;

  function addCase(
    name: string,
    handSize: number,
    playerInput: Partial<PlayerRoundData> & {
      bid: number | null;
      won: number | null;
      events: RoundEvent[];
    },
    roundPlayersInput?: (Partial<PlayerRoundData> & {
      bid: number | null;
      won: number | null;
      events: RoundEvent[];
    })[],
    scoringSystem: ScoringSystem = "classic",
  ) {
    const player: PlayerRoundData = {
      harryGiantBidDelta: null,
      score: 0,
      ...playerInput,
    };
    const roundPlayers: PlayerRoundData[] = roundPlayersInput
      ? roundPlayersInput.map((p) => ({
          harryGiantBidDelta: null,
          score: 0,
          ...p,
        }))
      : [player];

    const res = computeRoundScoreBreakdown({
      handSize,
      playerIndex: 0,
      player,
      roundPlayers,
      scoringSystem,
    });
    cases.push({
      id: `score_${String(seq++).padStart(4, "0")}`,
      name,
      handSize,
      playerIndex: 0,
      scoringSystem,
      player,
      roundPlayers,
      expected: res,
    });
  }

  // 1. Classic scoring: Bids 0..10 made and missed
  for (let r = 1; r <= 10; r++) {
    // Exact bid made: 20 * bid
    for (let bid = 1; bid <= r; bid++) {
      addCase(`Round ${r} bid ${bid} won ${bid}`, r, {
        bid,
        won: bid,
        events: [],
      });
    }

    // Missed bids over/under: -10 * |bid - won|
    addCase(`Round ${r} bid 3 won 1`, r, { bid: 3, won: 1, events: [] });
    addCase(`Round ${r} bid 1 won 3`, r, { bid: 1, won: 3, events: [] });

    // Zero bids
    addCase(`Round ${r} zero bid made`, r, { bid: 0, won: 0, events: [] });
    addCase(`Round ${r} zero bid missed (won 1)`, r, {
      bid: 0,
      won: 1,
      events: [],
    });
    addCase(`Round ${r} zero bid missed (won ${r})`, r, {
      bid: 0,
      won: r,
      events: [],
    });
  }

  // 2. Classic scoring bonuses
  // 14 bonuses
  addCase("Bid made with green 14 bonus (+10)", 5, {
    bid: 2,
    won: 2,
    events: [{ type: "fourteenBonus", playerIndex: 0, suit: "green" }],
  });
  addCase("Bid made with black 14 bonus (+20)", 5, {
    bid: 2,
    won: 2,
    events: [{ type: "fourteenBonus", playerIndex: 0, suit: "black" }],
  });
  addCase("Bid made with black and yellow 14s (+30)", 5, {
    bid: 2,
    won: 2,
    events: [
      { type: "fourteenBonus", playerIndex: 0, suit: "black" },
      { type: "fourteenBonus", playerIndex: 0, suit: "yellow" },
    ],
  });
  addCase("Bid missed with black 14: bonus forfeited", 5, {
    bid: 2,
    won: 3,
    events: [{ type: "fourteenBonus", playerIndex: 0, suit: "black" }],
  });

  // Hero captures
  addCase("Pirate captures 1 Mermaid (+20)", 5, {
    bid: 1,
    won: 1,
    events: [
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "pirate",
        count: 1,
      },
    ],
  });
  addCase("Pirate captures 2 Mermaids (+40)", 5, {
    bid: 1,
    won: 1,
    events: [
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "pirate",
        count: 2,
      },
    ],
  });
  addCase("Skull King captures 1 Pirate (+30)", 5, {
    bid: 1,
    won: 1,
    events: [
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "king",
        count: 1,
      },
    ],
  });
  addCase("Skull King captures 3 Pirates (+90)", 5, {
    bid: 1,
    won: 1,
    events: [
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "king",
        count: 3,
      },
    ],
  });
  addCase("Mermaid captures Skull King (+40)", 5, {
    bid: 1,
    won: 1,
    events: [
      {
        type: "characterCapture",
        capturerIndex: 0,
        capturingCard: "mermaid",
        count: 1,
      },
    ],
  });

  // Loot Alliance
  const alliedP0: PlayerRoundData = {
    bid: 2,
    won: 2,
    harryGiantBidDelta: null,
    score: 0,
    events: [{ type: "alliance", lootPlayerIndex: 0, trickWinnerIndex: 1 }],
  };
  const alliedP1Made: PlayerRoundData = {
    bid: 1,
    won: 1,
    harryGiantBidDelta: null,
    score: 0,
    events: [],
  };
  const alliedP1Missed: PlayerRoundData = {
    bid: 1,
    won: 2,
    harryGiantBidDelta: null,
    score: 0,
    events: [],
  };

  addCase("Alliance: both hit bids (+20 each)", 4, alliedP0, [
    alliedP0,
    alliedP1Made,
  ]);
  addCase("Alliance: partner missed bid (0 bonus)", 4, alliedP0, [
    alliedP0,
    alliedP1Missed,
  ]);

  // Rascal wager in classic
  addCase("Rascal wager made (+20)", 4, {
    bid: 2,
    won: 2,
    events: [
      { type: "pirateAbility", pirate: "rascal", ownerIndex: 0, wager: 20 },
    ],
  });
  addCase("Rascal wager missed (-20 penalty!)", 4, {
    bid: 2,
    won: 3,
    events: [
      { type: "pirateAbility", pirate: "rascal", ownerIndex: 0, wager: 20 },
    ],
  });

  // Harry the Giant delta
  addCase("Harry the Giant adjusts bid 2 to 3 (won 3) -> hit", 4, {
    bid: 2,
    won: 3,
    harryGiantBidDelta: 1,
    events: [],
  });

  // 3. Rascal's Scoring System
  // Rulebook Example A: Round 3 (30 potential) 3 players hit bids -> 30 each
  addCase(
    "Rascal Scoring Ex A: Round 3 Direct Hit",
    3,
    { bid: 2, won: 2, events: [] },
    undefined,
    "rascal",
  );

  // Rulebook Example B: Round 4 (40 potential) Harry/Shirley/Poe
  addCase(
    "Rascal Scoring Ex B: Direct Hit (40)",
    4,
    { bid: 1, won: 1, events: [] },
    undefined,
    "rascal",
  );
  addCase(
    "Rascal Scoring Ex B: Glancing Blow off by 1 (20)",
    4,
    { bid: 2, won: 1, events: [] },
    undefined,
    "rascal",
  );
  addCase(
    "Rascal Scoring Ex B: Complete Miss off by 2 (0)",
    4,
    { bid: 3, won: 1, events: [] },
    undefined,
    "rascal",
  );

  // Cannonball
  addCase(
    "Cannonball Direct Hit (15 * 4 = 60)",
    4,
    {
      bid: 2,
      won: 2,
      ammoChoice: "cannonball",
      events: [],
    },
    undefined,
    "rascal",
  );

  addCase(
    "Cannonball Miss off by 1 (0 pts, all-or-nothing)",
    4,
    {
      bid: 2,
      won: 3,
      ammoChoice: "cannonball",
      events: [],
    },
    undefined,
    "rascal",
  );

  // Rascal bonus scaling under Rascal Scoring (100% on direct, 50% on glancing, 0% on miss)
  const bonusEvents = [
    { type: "fourteenBonus" as const, playerIndex: 0, suit: "black" as const }, // 20
    { type: "fourteenBonus" as const, playerIndex: 0, suit: "green" as const }, // 10 -> total 30
  ];
  addCase(
    "Rascal Scoring: Direct Hit with 30 bonus (100% = 30)",
    4,
    {
      bid: 2,
      won: 2,
      events: bonusEvents,
    },
    undefined,
    "rascal",
  );
  addCase(
    "Rascal Scoring: Glancing Blow with 30 bonus (50% = 15)",
    4,
    {
      bid: 2,
      won: 3,
      events: bonusEvents,
    },
    undefined,
    "rascal",
  );
  addCase(
    "Rascal Scoring: Complete Miss with 30 bonus (0% = 0)",
    4,
    {
      bid: 2,
      won: 0,
      events: bonusEvents,
    },
    undefined,
    "rascal",
  );

  // Rascal wager in Rascal Scoring
  addCase(
    "Rascal Scoring: Rascal wager made (+20)",
    4,
    {
      bid: 2,
      won: 2,
      events: [
        { type: "pirateAbility", pirate: "rascal", ownerIndex: 0, wager: 20 },
      ],
    },
    undefined,
    "rascal",
  );
  addCase(
    "Rascal Scoring: Rascal wager glancing blow (-20 penalty)",
    4,
    {
      bid: 2,
      won: 3,
      events: [
        { type: "pirateAbility", pirate: "rascal", ownerIndex: 0, wager: 20 },
      ],
    },
    undefined,
    "rascal",
  );
  addCase(
    "Rascal Scoring: Rascal wager complete miss (-20 penalty)",
    4,
    {
      bid: 2,
      won: 0,
      events: [
        { type: "pirateAbility", pirate: "rascal", ownerIndex: 0, wager: 20 },
      ],
    },
    undefined,
    "rascal",
  );

  return cases;
}

// -------------------------------------------------------------
// 4. SEEDED FULL MATCHES GOLDEN VECTORS
// -------------------------------------------------------------

type MatchAction =
  | { roundIndex: number; type: "bid"; playerIndex: number; bid: number }
  | {
      roundIndex: number;
      type: "play";
      playerIndex: number;
      cardId: string;
      tigressMode?: TigressMode;
    }
  | {
      roundIndex: number;
      type: "ability";
      playerIndex: number;
      action: any;
    }
  | { roundIndex: number; type: "confirm" };

type MatchCase = {
  matchId: string;
  seed: number;
  playerCount: number;
  roundsSchema: number[];
  scoringSystem: ScoringSystem;
  artifacts: MatchConfig["artifacts"];
  ruleFlags: RuleFlags;
  actions: MatchAction[];
  finalScores: number[];
  roundSummaries: {
    roundIndex: number;
    handSize: number;
    scores: {
      playerIndex: number;
      bid: number | null;
      won: number;
      main: number;
      bonus: number;
      total: number;
    }[];
  }[];
};

function playSeededMatch(
  seed: number,
  playerCount: number,
  roundsSchema: number[],
  scoringSystem: ScoringSystem = "classic",
): MatchCase {
  const baseConfig = defaultMatchConfig(playerCount);
  const config: MatchConfig = {
    ...baseConfig,
    roundsSchema,
    scoringSystem,
  };

  let state = createMatchState("GOLDEN", "host", config);
  state = startMatch(state, seed);

  const actions: MatchAction[] = [];
  const roundSummaries: MatchCase["roundSummaries"] = [];

  for (let r = 0; r < roundsSchema.length; r++) {
    state = startRound(state, seed + r * 100);
    const round = state.currentRound!;
    const handSize = round.handSize;

    // 1. Submit deterministic bids (e.g. bid 0 for P0, 1 for P1, etc. clamped to handSize)
    for (let p = 0; p < playerCount; p++) {
      const bid = Math.min(handSize, p % (handSize + 1));
      actions.push({ roundIndex: r, type: "bid", playerIndex: p, bid });
      state = applyBid(state, p, bid) as MatchState;
    }

    // 2. Play all tricks in the round
    for (let t = 0; t < handSize; t++) {
      for (let step = 0; step < playerCount; step++) {
        const curRound = state.currentRound!;
        const turnPlayer =
          curRound.currentTrick.length === 0
            ? curRound.trickLeaderIndex
            : (curRound.currentTrick[curRound.currentTrick.length - 1]!
                .playerIndex +
                1) %
              playerCount;

        const hand = curRound.hands[turnPlayer]!;
        // Choose first legal card
        const legal = getLegalCards(
          hand,
          curRound.currentTrick,
          config.ruleFlags,
        );
        if (legal.length === 0) {
          throw new Error(
            `No legal cards for player ${turnPlayer} in round ${r} trick ${t}`,
          );
        }
        const chosenCard = legal[0]!;
        const tigressMode =
          chosenCard.def.kind === "tigress" ? "escape" : undefined;

        actions.push({
          roundIndex: r,
          type: "play",
          playerIndex: turnPlayer,
          cardId: chosenCard.id,
          tigressMode,
        });

        const res = applyPlayCard(
          state,
          turnPlayer,
          chosenCard.id,
          tigressMode,
        );
        if ("error" in res) {
          throw new Error(`applyPlayCard failed: ${res.error}`);
        }
        state = res;

        // Check if ability is triggered
        if (
          state.currentRound?.phase === "ability" &&
          state.currentRound.pendingAbility
        ) {
          const ability = state.currentRound.pendingAbility;
          const owner = ability.winnerIndex;
          let abilityAction: any = { type: "juanita" };
          if (ability.pirate === "rascal") {
            abilityAction = { type: "rascal", wager: 10 };
          } else if (ability.pirate === "bendt") {
            abilityAction = {
              type: "bendt",
              drawCardIds: [],
              discardCardIds: [],
            };
          } else if (ability.pirate === "juanita") {
            abilityAction = { type: "juanita" };
          } else if (ability.pirate === "rosie") {
            abilityAction = {
              type: "rosie",
              nextLeaderIndex: (owner + 1) % playerCount,
            };
          } else if (ability.pirate === "harry") {
            abilityAction = { type: "harry", delta: 1 };
          }

          actions.push({
            roundIndex: r,
            type: "ability",
            playerIndex: owner,
            action: abilityAction,
          });

          const abRes = applyAbility(state, abilityAction);
          if ("error" in abRes) {
            throw new Error(`applyAbility failed: ${abRes.error}`);
          }
          state = abRes;
        }
      }
    }

    // 3. Round reaches scoring phase -> confirm round
    actions.push({ roundIndex: r, type: "confirm" });
    const confRes = confirmRound(state);
    state = confRes;

    // Capture round summary
    const completedRound = state.roundHistory[state.roundHistory.length - 1]!;
    roundSummaries.push({
      roundIndex: r,
      handSize,
      scores: completedRound.results.map((res) => ({
        playerIndex: res.seatIndex,
        bid: res.bid,
        won: res.won,
        main: res.main,
        bonus: res.bonus,
        total: res.total,
      })),
    });
  }

  const finalScores = state.cumulativeScores;

  return {
    matchId: `match_seed_${seed}_p${playerCount}_${scoringSystem}`,
    seed,
    playerCount,
    roundsSchema,
    scoringSystem,
    artifacts: config.artifacts,
    ruleFlags: config.ruleFlags ?? { escapeLeadDefersThroughCharacters: false },
    actions,
    finalScores,
    roundSummaries,
  };
}

function generateMatchCases(): MatchCase[] {
  const matches: MatchCase[] = [
    playSeededMatch(101, 2, [1, 2, 3], "classic"),
    playSeededMatch(202, 3, [1, 2, 3, 4], "classic"),
    playSeededMatch(303, 3, [1, 2, 3, 4], "rascal"),
    playSeededMatch(404, 4, [1, 2, 3], "classic"),
    playSeededMatch(505, 4, [1, 2, 3], "rascal"),
    playSeededMatch(606, 5, [1, 2], "classic"),
    playSeededMatch(707, 6, [1, 2], "classic"),
    playSeededMatch(808, 2, [1, 2, 3, 4, 5], "classic"),
    playSeededMatch(909, 3, [1, 2, 3], "classic"),
    playSeededMatch(1001, 4, [1, 2, 3, 4], "classic"),
  ];
  return matches;
}

// -------------------------------------------------------------
// MAIN EXPORT RUNNER
// -------------------------------------------------------------

function main() {
  ensureOutDir();

  console.log("Generating tricks golden vectors...");
  const tricks = generateTrickCases();
  fs.writeFileSync(
    path.join(OUT_DIR, "tricks.json"),
    `${JSON.stringify(tricks, null, 2)}\n`,
  );
  console.log(`✓ tricks.json: ${tricks.length} cases (must be >= 200)`);

  console.log("Generating legal moves golden vectors...");
  const legalMoves = generateLegalMoveCases();
  fs.writeFileSync(
    path.join(OUT_DIR, "legal_moves.json"),
    `${JSON.stringify(legalMoves, null, 2)}\n`,
  );
  console.log(`✓ legal_moves.json: ${legalMoves.length} cases`);

  console.log("Generating scoring golden vectors...");
  const scoring = generateScoringCases();
  fs.writeFileSync(
    path.join(OUT_DIR, "scoring.json"),
    `${JSON.stringify(scoring, null, 2)}\n`,
  );
  console.log(`✓ scoring.json: ${scoring.length} cases`);

  console.log("Generating full match replays golden vectors...");
  const matches = generateMatchCases();
  fs.writeFileSync(
    path.join(OUT_DIR, "matches.json"),
    `${JSON.stringify(matches, null, 2)}\n`,
  );
  console.log(`✓ matches.json: ${matches.length} matches`);

  console.log(
    "All golden test vectors exported successfully to testdata/skull-king/",
  );
}

main();
