# GUB: rules fixes, docs, and general Go game backend

Date: 2026-11-11. Status: updated 2026-11-11 with owner decisions. Not yet implemented.
Inputs: [Skull King rules audit](../research/skull-king-rules-audit.md), the existing TS engine under `src/lib/games/skull-king/`.

## Owner decisions (2026-11-11)

1. Two-player Graybeard variant: **in v1** (engine, UI, docs).
2. Rascal's Scoring (Direct Hit / Glancing Blow / Complete Miss, Cannonball/Grapeshot): **fully in v1** (engine, UI, docs). Scoring system is a match setting.
3. Generality proof: Claude's pick, see Phase 7: Connect Four (discrete, turn-based) plus a small realtime arena (continuous, fixed tick).
4. Storage: **Postgres from the start**, and the system must scale horizontally as a long-term game platform (see "Scaling architecture").

## Goals

1. Skull King rules are correct and documented, checked against two or more sources.
2. A Go backend that hosts any game: discrete or continuous, turn-based or realtime, hidden or open information.
3. Players and viewers on mobile, tablet and desktop. A viewer is a read-only "table display" for a TV or tablet.
4. Skull King is the first plugin. A second, different game proves the design before we call it general.

## Phases and slices

Each slice is self-contained for a Haiku implementer (goal, files, rules, acceptance, verification). Claude reviews every diff, owns git, and runs the verification. Slices in one phase run in parallel only when their files are disjoint.

### Phase 0: branch hygiene (Claude)

- Create `feat/rules-audit-and-go-backend` from `main`, carry over the lobby form fix and the audit file, commit.
- Acceptance: `git status` clean; `npm run typecheck` and `npm run test:run` pass.

### Phase 1: fix the TS engine (reference implementation)

The TS engine stays the oracle until the Go port reproduces it. Every fix is test-first.

| Slice | Change | Files | Acceptance |
|---|---|---|---|
| 1.1 | Captures count each card: SK takes N pirates = +30N, Pirate takes N mermaids = +20N | `engine/trick-resolution.ts`, `engine/scoring-bridge.ts`, tests | New tests: SK + 3 pirates gives 90; Pirate + 2 mermaids gives 40 |
| 1.2 | Rascal wager: -wager on a missed bid (not "forfeited") | `round-score/score-rules.ts` (`scoreRascal` moves out of the made-bid-only branch), tests | Bid 3 won 4 wager 20 gives main -10 and -20 = -30 |
| 1.3 | Whale last + only specials: Whale player leads. Kraken last: would-be winner leads | `engine/trick-resolution.ts`, `engine/match-reducer.ts`, tests | Cases from the publisher FAQ example pass |
| 1.4 | Two Loots: one alliance per Loot card; none if the winner played it | `trick-resolution.ts` `lootAlliance`, types, tests | Two Loots + different winner gives 2 alliances |
| 1.5 | Remove follow-suit unlock after a mid-trick Kraken/Whale | `engine/legal-moves.ts` (`getLegalCardsForPlayer`), tests | Later players must still follow suit |
| 1.7 | Add Rascal's Scoring to the oracle: per-round potential = 10 x cards dealt; Direct Hit full, off by 1 half, off by 2+ none; bonuses scale the same way; optional Cannonball (15 x cards, all-or-nothing) / Grapeshot choice after bidding | `round-score/score-rules.ts`, `round-score/types.ts`, `engine/types.ts` (`scoringSystem: "classic" \| "rascal"`), tests | Worked examples from rulebook pp.18-20 pass (3 players 30 pts; Harry/Shirley/Poe round 4) |
| 1.6 | Add rule flags: `escapeLeadDefersThroughCharacters` (default false) | `engine/types.ts`, `lead-suit.ts` | Both flag values tested |

Verification for the phase: `npm run typecheck && npm run test:run && npm run lint`.

### Phase 2: docs corrections (parallel with Phase 1)

| Slice | Change | Files |
|---|---|---|
| 2.1 | Player count 2-8; add Graybeard two-player page (shipping in v1, so also `app/play.md`); fix "page 14" to the right page | `rules/00`, `01`, `09`, new `rules/11-two-player.md` |
| 2.2 | Fix Loot ("automatic", not "may"), all-escape wording ("first card"), Rascal wager (lose it) | `rules/04`, `06`, `07`, `08`, `10`, `reference/*` |
| 2.3 | Document both scoring systems (classic and Rascal's: Direct Hit, Glancing Blow, Complete Miss, Cannonball/Grapeshot) with worked examples | `rules/06-scoring.md`, `reference/scoring-quick-ref.md`, `app/*.md` |
| 2.4 | Record house rules (audit items 3 to 5) in a "Rulings" section and the FAQ; add source citations per rule | `rules/10-faq.md`, `reference/trick-resolution.md` |
| 2.5 | Regenerate the docs search index and run the docs drift test | `public/games/skull-king/docs-search.json` |

Acceptance: `npm run test:run` (including `score-rules-docs-drift.test.ts`) and `npm run build` pass. Claude re-reads each page against the audit table.

### Phase 3: golden vectors

- Slice 3.1: a script exports JSON test vectors from the TS engine: trick resolution (cards in, outcome and captures out), legal moves, scoring, full seeded matches (seed, action log, final scores).
- Location: `testdata/skull-king/*.json` in the repo root. Language-neutral, so the Go port must match them.
- Acceptance: vectors regenerate byte-identically; at least 200 trick cases covering every row in the audit table.

### Phase 4: Go core (game-agnostic)

New Go module `server/` (go.work entry). Packages and the patterns they carry:

| Package | Responsibility | Pattern |
|---|---|---|
| `core/game` | `Game` interface: `Setup(config, seed)`, `Validate(state, actor, cmd)`, `Apply(state, actor, cmd) (events)`, `Tick(state, dt) (events)` (optional), `View(state, audience)`, `Phase` access | Strategy, Template Method |
| `core/registry` | Register games by ID; construct with config | Registry + Abstract Factory |
| `core/phase` | Phase/turn state machine, simultaneous stages (for bids), timers | State |
| `core/room` | One goroutine per room owns the state; inbox of commands; emits events; idle shutdown | Actor, Mediator |
| `core/event` | Append-only log with sequence numbers; snapshot every N events; replay | Event Sourcing, Memento |
| `core/view` | Per-audience projections (seat, host, viewer, replay) so hidden info never leaves the server | Visitor / Projection |
| `core/clock` | `Clock` interface: `StepClock` (turn-based, no ticks) and `FixedTick` (realtime, drains input queue) | Strategy |
| `core/transport` | WebSocket (`coder/websocket`) and SSE fallback behind one `Conn` interface | Adapter |
| `core/session` | Join codes, seats, roles (`player`, `host`, `viewer`), reconnect tokens, per-seat auth | Facade |
| `core/store` | `EventStore` interface; in-memory and Postgres implementations | Repository |
| `core/bot` | Optional bot seat running the same `Validate/Apply` | Strategy |

Rules for the core:

- No game rule appears in `core/`. Games are plugins under `games/<id>/`.
- All randomness comes from the room seed, so a match replays exactly.
- Wire protocol is versioned JSON: `join`, `command`, `event`, `snapshot`, `resync(lastSeq)`, `error`. Schema lives in `server/api/` and is generated into TS types for the client.
- Continuous games set `FixedTick`; client prediction and interpolation (Gambetta) are opt-in per game through the `View` payload, not baked into the core.

Slices: 4.1 module scaffold + `Game` interface + registry; 4.2 event log + snapshot + replay; 4.3 phase machine; 4.4 room actor + clock strategies; 4.5 session/roles/tokens; 4.6 transports; 4.7 Postgres schema, migrations and `EventStore`; 4.8 room placement, leases and cross-node fan-out (see Scaling architecture); 4.9 observability (structured logs, metrics, traces). Each has table-driven tests and a race-detector run.

Verification: `cd server && go vet ./... && go test -race ./...`.

### Phase 5: Skull King plugin in Go

- Slices: 5.1 cards/deck/deal; 5.2 lead suit + legal moves; 5.3 trick resolution (all rows of the audit, with the Phase 1 fixes); 5.4 scoring: classic and Rascal's Scoring (with Cannonball/Grapeshot choice phase); 5.5 pirate abilities as commands; 5.6 phases (bid simultaneous, play, ability, score) and `View` per audience; 5.7 two-player Graybeard (ghost hand as a system actor: flips top card, plays Tigress as Escape, leads when he wins, no bid, no score).
- Acceptance: every golden vector from Phase 3 passes; a seeded full-match replay produces identical scores to the TS oracle for 100 seeds.

### Phase 6: client

- Slices: 6.1 WebSocket client hook replacing the 1.5 s polling; 6.2 join flow with role choice (player / viewer); 6.3 viewer "table display" page: large type, trick area, scores, no hidden data, Wake Lock (with fallback message), safe against `prefers-reduced-motion`; 6.4 responsive player UI for phone, tablet, desktop; 6.5 reconnect and resync UX; 6.7 setup screens for scoring system, Cannonball/Grapeshot choice, and two-player mode; 6.6 remove `sessionStorage` player IDs in favour of tokens kept in an HttpOnly cookie or header.
- Each UI slice follows the modern-web-guidance guides (dialog, forms, responsive design, accessibility, motion) and gets a visual check at 390, 768 and 1440 px, plus a 1920x1080 TV pass for the viewer.

### Phase 7: prove generality

Why two games: Skull King is discrete, turn-based and hidden-information. To call the core general it must also host the opposite corners without core changes.
- Slice 7.1: **Connect Four** (discrete, turn-based, perfect information, 2 players + viewers). Tests the simplest plugin path and the viewer role.
- Slice 7.2: **Arena** (continuous, realtime): 2 to 4 players move dots on a bounded field and bump each other off, 20 Hz fixed tick, input buffering, client interpolation. Tests `FixedTick`, `Tick`, and high-rate views. Intentionally tiny; it proves the shape, not scale.
- Acceptance: neither requires a change in `core/`; if one does, the interface is wrong and we fix the interface first.

### Phase 8: cutover

- Dockerfile for the Go server, CI job for `go vet`, `go test -race`, and the golden vectors; Next.js `app/api/**` routes removed after the client switches; docs updated (`docs/contributing/adding-a-game.md` rewritten for the plugin interface).
- Deploy to the demo/dev environment only. Nothing touches production unless named. Claude owns deploys and secrets.

## Scaling architecture (Postgres from day one)

Design for many rooms across many nodes, while a single node stays simple to run.

- **Stateless edge, stateful rooms.** Any node accepts a WebSocket. A room lives on exactly one node at a time (single-writer), so game logic never needs distributed locks.
- **Room placement and leases.** A `room_lease` table (room id, owner node, lease expiry, fencing epoch) in Postgres. A node claims a room by upserting the lease; heartbeats renew it. If a node dies the lease expires and another node adopts the room by loading its latest snapshot and replaying events after it. The epoch fences stale writers: appends carry the epoch and fail if it is old.
- **Routing.** A node that receives a join for a room it does not own forwards the connection to the owner (internal gateway), or the client is redirected with a node hint. Start with the owner-hint redirect; add a gateway only if needed.
- **Fan-out between nodes.** Viewers and players of one room all attach to the owner node first (simple, v1). When a room has very many viewers, add read replicas: the owner publishes events on a pub/sub bus (Postgres `LISTEN/NOTIFY` for v1; NATS behind a `Bus` interface when volume demands) and viewer-only nodes subscribe.
- **Schema.** `games` (catalog), `rooms` (id, game id, config, seed, status), `room_events` (room id, seq, type, payload, actor, created_at; unique on room id + seq; partitioned by time), `room_snapshots` (room id, seq, state blob), `room_members` (room id, seat, role, token hash), `matches_summary` (results for history and leaderboards). Events are append-only and never rewritten.
- **Config, not code, per game.** Game definitions declare player range, roles, clock mode and options so lobbies, matchmaking and UI are generated from the registry.
- **Versioning.** Every event carries `schema_version` and the plugin has upcasters, so old matches replay after rule changes. Plugins declare a `rules_version` recorded in `rooms`.
- **Limits and safety.** Per-connection rate limits, max message size, bounded inbox per room (back-pressure), idle room eviction with a final snapshot, graceful drain on deploy (stop accepting new rooms, hand off leases).
- **Accounts later.** Seats are anonymous tokens in v1. The `room_members` table has a nullable `user_id` so Orbit auth can be attached in a later platform-integration slice (still deferred per AGENTS.md).
- **Testing at scale.** Multi-node integration test (two server processes, one Postgres): kill the owner mid-match, assert the match resumes with identical state; a soak test with several thousand idle rooms and a few hundred active ones.

## Order and dependencies

0 -> (1 and 2 in parallel) -> 3 -> 4 -> 5 -> 6 -> 7 -> 8. Phases 4 and 6.1 can overlap once the wire schema is frozen.

## Risks

- Rules for audit items 3 to 5 are house rules until the publisher answers; they sit behind flags so we can flip them.
- Realtime games need load and latency testing that a card game does not; Phase 7.2 only proves the shape, not scale.
- Hidden-information leaks are the main security risk; every `View` has a test asserting no other seat's hand appears in the payload.

## Open questions

None blocking. To confirm during Phase 4: which Postgres instance and database name the demo environment uses (the shared instance holds other products; a dedicated `gub` database is the default assumption), and the production-name check before any deploy.
