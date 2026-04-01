#!/bin/bash
# -------------------------------------------------------------------
# 🚀 GeoSurePath "Production Bundle" Synchronization Utility
# Syncs traccar-web source builds to the root /web production folder.
# -------------------------------------------------------------------

set -e

PROJECT_ROOT=$(pwd)
WEB_SRC="$PROJECT_ROOT/traccar-web"
WEB_DEST="$PROJECT_ROOT/web"

echo "🛰️  Initiating Production Bundle Synchronization..."

# 1. Build Verification
if [ ! -d "$WEB_SRC" ]; then
    echo "❌ Error: traccar-web source not found."
    exit 1
fi

cd "$WEB_SRC"
echo "📦 Building High-Integrity React Bundle..."
npm run build || { echo "❌ Build failed."; exit 1; }

# 2. Synchronization
echo "🧹 Purging stale production assets in /web..."
rm -rf "$WEB_DEST"/*

echo "🚚 Deploying fresh bundle to production layer..."
cp -r "$WEB_SRC/build/"* "$WEB_DEST/"

cd "$PROJECT_ROOT"

# 3. Final Verification
if [ -f "$WEB_DEST/index.html" ]; then
    echo "✅ PRODUCTION BUNDLE SYNCHRONIZED SUCCESSFULLY."
    echo "📍 Path: $WEB_DEST"
else
    echo "⚠️  Synchronization anomaly detected (index.html missing)."
fi
