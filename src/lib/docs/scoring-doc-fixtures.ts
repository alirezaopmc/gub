import type { PlayerRoundData } from "@/lib/games/skull-king/round-score/types"

export const SCORE_RULES_SOURCE = "src/lib/games/skull-king/round-score/score-rules.ts"

export const SCORING_DOC_PATHS = [
  "games/skull-king/rules/06-scoring.md",
  "games/skull-king/reference/scoring-quick-ref.md",
] as const

/** Multipliers documented in both scoring pages. */
export const SCORING_FORMULA_SNIPPETS = ["+20 × bid", "−10 ×", "+10 ×"] as const

export const SCORING_BONUS_RATES = {
  fourteenStandard: 10,
  fourteenBlack: 20,
  pirateCapturesMermaid: 20,
  kingCapturesPirate: 30,
  mermaidCapturesKing: 40,
  alliance: 20,
} as const

/** Substrings for bonus rates that must appear in both scoring docs. */
export const SCORING_BONUS_DOC_SNIPPETS = [
  "+10",
  "+20",
  "+30",
  "+40",
] as const

export type BidWonFixture = {
  label: string
  handSize: number
  bid: number
  won: number
  expected: number
  /** Must appear in both scoring markdown files. */
  docSnippets: readonly string[]
}

export const BID_WON_FIXTURES: readonly BidWonFixture[] = [
  {
    label: "exact bid (inline)",
    handSize: 5,
    bid: 3,
    won: 3,
    expected: 60,
    docSnippets: ["+60"],
  },
  {
    label: "miss (inline)",
    handSize: 5,
    bid: 2,
    won: 4,
    expected: -20,
    docSnippets: ["−20"],
  },
  {
    label: "zero bid success (inline)",
    handSize: 7,
    bid: 0,
    won: 0,
    expected: 70,
    docSnippets: ["+70"],
  },
  {
    label: "zero bid fail (inline)",
    handSize: 9,
    bid: 0,
    won: 2,
    expected: -90,
    docSnippets: ["−90"],
  },
]

/** Worked examples A–D — documented only in scoring-quick-ref.md. */
export const BID_WON_QUICK_REF_FIXTURES: readonly BidWonFixture[] = [
  {
    label: "example A",
    handSize: 5,
    bid: 4,
    won: 4,
    expected: 80,
    docSnippets: ["+80"],
  },
  {
    label: "example B",
    handSize: 6,
    bid: 3,
    won: 5,
    expected: -20,
    docSnippets: ["Example B"],
  },
  {
    label: "example C",
    handSize: 8,
    bid: 0,
    won: 0,
    expected: 80,
    docSnippets: ["Example C", "+80"],
  },
  {
    label: "example D",
    handSize: 10,
    bid: 0,
    won: 1,
    expected: -100,
    docSnippets: ["−100"],
  },
]

export type RoundBreakdownFixture = {
  label: string
  handSize: number
  player: PlayerRoundData
  roundPlayers: readonly PlayerRoundData[]
  expectedMain: number
  expectedBonus: number
  expectedTotal: number
  docSnippets: readonly string[]
}

const exampleEPlayer: PlayerRoundData = {
  bid: 2,
  won: 2,
  harryGiantBidDelta: null,
  events: [
    { type: "fourteenBonus", playerIndex: 0, suit: "black" },
    { type: "characterCapture", capturerIndex: 0, capturingCard: "mermaid", count: 1 },
  ],
  score: 0,
}

const rascalMadePlayer: PlayerRoundData = {
  bid: 3,
  won: 3,
  harryGiantBidDelta: null,
  events: [{ type: "pirateAbility", ownerIndex: 0, pirate: "rascal", wager: 20 }],
  score: 0,
}

const rascalMissPlayer: PlayerRoundData = {
  bid: 3,
  won: 4,
  harryGiantBidDelta: null,
  events: [{ type: "pirateAbility", ownerIndex: 0, pirate: "rascal", wager: 20 }],
  score: 0,
}

export const ROUND_BREAKDOWN_FIXTURES: readonly RoundBreakdownFixture[] = [
  {
    label: "example E",
    handSize: 5,
    player: exampleEPlayer,
    roundPlayers: [exampleEPlayer],
    expectedMain: 40,
    expectedBonus: 60,
    expectedTotal: 100,
    docSnippets: ["+100", "Main: +40"],
  },
  {
    label: "example F made bid",
    handSize: 5,
    player: rascalMadePlayer,
    roundPlayers: [rascalMadePlayer],
    expectedMain: 60,
    expectedBonus: 20,
    expectedTotal: 80,
    docSnippets: ["+80", "Rascal **+20**"],
  },
  {
    label: "example F missed bid",
    handSize: 5,
    player: rascalMissPlayer,
    roundPlayers: [rascalMissPlayer],
    expectedMain: -10,
    expectedBonus: 0,
    expectedTotal: -10,
    docSnippets: ["bonuses **forfeited** → **−10**"],
  },
]

/** Snippets that must appear in both scoring docs (not quick-ref-only). */
export const SHARED_DOC_SNIPPETS = ["forfeited"] as const
