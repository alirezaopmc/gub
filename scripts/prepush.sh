#!/usr/bin/env bash
# ADR-076 local test step: called by manovaspace/ci ci/prepush.sh with the pushed ranges as args.
# Runs the fast offline checks of the CI gate: Go vet and race tests for server/, the TypeScript
# typecheck and Vitest. Never installs, never reaches the network.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# /tmp is a small tmpfs on the dev host; Go link steps need disk.
export GOTMPDIR="${GOTMPDIR:-${XDG_CACHE_HOME:-$HOME/.cache}/go-tmp}"
mkdir -p "$GOTMPDIR"

echo "==> go vet (server)"
GOWORK=off go -C server vet ./...

echo "==> go test -race (server)"
GOWORK=off go -C server test -race ./...

if [[ ! -d node_modules ]]; then
  echo "gub-prepush: node_modules missing, skipping typecheck and tests (run bun install)"
  exit 0
fi

echo "==> bun run typecheck"
bun run typecheck

echo "==> bun run test:run"
bun run test:run
