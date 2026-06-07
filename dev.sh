#!/usr/bin/env bash
# Dev launcher for Health Tracker (Electron + Vite).
#
# Why this exists: the project lives under a folder whose name contains colons
# (".../8:39:01 PM/..."). Colons are the PATH separator on Unix, so npm's
# injected "node_modules/.bin" entry gets split into broken fragments and bare
# commands like `concurrently`, `vite`, and `electron` can't be found. That
# makes `npm run electron:dev` fail with "concurrently: command not found".
#
# This script sidesteps the problem by invoking the binaries via explicit
# relative paths instead of relying on PATH resolution.

set -euo pipefail
cd "$(dirname "$0")"

BIN="./node_modules/.bin"

cleanup() {
  [[ -n "${VITE_PID:-}" ]] && kill "$VITE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Vite dev server..."
"$BIN/vite" &
VITE_PID=$!

# Wait for the dev server to accept connections on :5173
echo "Waiting for http://localhost:5173 ..."
for _ in $(seq 1 60); do
  if curl -s -o /dev/null http://localhost:5173/; then
    break
  fi
  sleep 0.5
done

echo "Launching Electron..."
NODE_ENV=development "$BIN/electron" .

# When Electron exits, the trap stops Vite.
