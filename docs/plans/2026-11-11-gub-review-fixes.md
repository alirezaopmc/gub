# GUB review fixes

Date: 2026-11-11. Source: review of `feat/rules-audit-and-go-backend`. Parent plan: [go-backend-rewrite](2026-11-11-go-backend-rewrite.md).

Done by Claude: DSN no longer logged; `RoomSession.SeatIndexes()`, `Started`, `Manager.MarkStarted`, `ErrRoomStarted` added.

## Wave 1 (parallel, disjoint files)

- **Slice 1, lobby and replay** (`core/room`, `core/hub`, `core/event`, `core/game`, `games/*`): rooms start in a lobby; a host `start` creates the game with the real seats; the log stores commands, so replay is correct; games restore snapshots exactly.
- **Slice 2, hardening** (`core/session`, `core/transport`, `cmd/server`): lock fixes, body and message limits, input validation, CORS/origin from env, token cleanup.

## Wave 2 (after wave 1)

- Slice 3: Postgres for real (insert `rooms`, run migrations at start, persistent sessions repository, Postgres lease manager).
- Slice 4: epoch fencing in `AppendEvents`, lease renewal, room eviction, tick/snapshot error handling, slow-consumer resync, CI golden-vector check.
