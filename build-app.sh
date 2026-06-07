#!/usr/bin/env bash
# Build the Health Tracker macOS .app and install it to /Applications.
#
# Use this instead of `npm run electron:build:mac`: this project's folder name
# contains colons (".../8:39:01 PM/..."), which are the Unix PATH separator, so
# npm's node_modules/.bin entry is mangled and bare commands (vite,
# electron-builder) can't be found. This script calls the binaries by explicit
# path to sidestep that.
#
# Native module note: better-sqlite3 must already be built for Electron's ABI.
# `npm install` does that automatically via the postinstall hook
# (scripts/rebuild-electron-sqlite.cjs); run `npm run rebuild:electron` if needed.

set -euo pipefail
cd "$(dirname "$0")"

BIN="./node_modules/.bin"
APP_NAME="Health Tracker"
BUILT_APP="release/mac-arm64/${APP_NAME}.app"
DEST="/Applications/${APP_NAME}.app"

echo "==> Building renderer (vite)..."
ELECTRON_BUILD=true "$BIN/vite" build

echo "==> Packaging .app (electron-builder)..."
# npmRebuild:false (in package.json) keeps electron-builder from attempting its
# own native rebuild, which fails on this spaced/coloned path; it packages the
# already-correct Electron-ABI better-sqlite3 binary instead.
rm -rf release
CSC_IDENTITY_AUTO_DISCOVERY=false "$BIN/electron-builder" --mac --dir

echo "==> Installing to ${DEST} ..."
osascript -e "quit app \"${APP_NAME}\"" 2>/dev/null || true
sleep 1
rm -rf "$DEST"
ditto "$BUILT_APP" "$DEST"

# Register with Launch Services so it appears in Spotlight / Launchpad.
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$DEST" 2>/dev/null || true

# Remove the local build copy so it doesn't show up as a duplicate in Spotlight.
rm -rf release

echo "==> Done. Launch it from Spotlight/Launchpad or: open -a \"${APP_NAME}\""
