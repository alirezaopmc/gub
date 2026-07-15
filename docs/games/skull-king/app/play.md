---
title: Play mode
description: Live Skull King multiplayer in GUB — join codes, match flow, and limitations.
audience: user
game: skull-king
section: app
order: 1
---

# Play mode

Route: `/games/skull-king/play`

Live **3–8 player** Skull King matches. Each player uses their own device.

## Before you start

- Stable internet for all players (matches are server-hosted).
- Host creates the match; others join with a **2-letter code**.
- Agree on artifact toggles and round schema before starting — set at match creation.

## Create a match (host)

1. Open **Play** from the [hub](./hub.md).
2. Configure players, rounds, and artifacts (same concepts as Calculator setup).
3. Share the **join code** with the table.
4. Players open `/games/skull-king/play/m/[code]` or enter the code from the lobby.

## Join a match

1. Open **Play**.
2. Enter the host's **2-letter code**.
3. Pick your seat / name when prompted.

## During the match

The app guides:

- **Bidding** — enter bids per round
- **Trick play** — legal moves enforced by the engine
- **Pirate abilities** — prompted when you win with a Pirate (if enabled)
- **Scoring** — automatic at round end when configured

Refresh behavior: match state is restored from the server while the match exists.

## End of voyage

- Highest total score wins.
- **Ties** end in **shared victory** (no tiebreaker round).

## Limitations

| Topic | Current behavior |
|-------|------------------|
| Persistence | Matches are **in-memory** (~4 hour TTL); not a long-term archive |
| Calculator | Play does not replace Calculator for paper-deck scoring — use [Calculator](./calculator.md) |
| Offline | Requires connection to GUB server |

## Related

- [Hub](./hub.md) — Play vs Calculator
- [Rules](../rules/00-overview.md)
- [Pirate abilities](../rules/08-pirate-abilities.md)
- [FAQ](../rules/10-faq.md)
