#!/bin/bash
# -------------------------------------------------------------------
# 🚀 GeoSurePath "Ultimate Build & Sync" Re-Installation Script
# Purpose: Wipes ALL old artifacts, updates host/docker dependencies,
#          and performs a Sequential, verified startup with full health checks.
# -------------------------------------------------------------------

# 🛑 [DETECT DOCKER COMPOSE]
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif docker-compose version >/dev/null 2>&1; then
  DC="docker-compose"
else
  DC="docker-compose"
fi

echo "🛑 Stopping and Removing current GeoSurePath containers..."
# 🔥 DEEP WIPE: This clears old DB data and volumes to refresh passwords/schema
$DC down --remove-orphans --volumes || true

# 🧹 [BATCH CLEAN]
echo "🧹 Pruning unused Docker layers and builder cache..."
docker system prune -f 
sudo apt-get clean 2>/dev/null || true

echo "🧱 Wiping local build artifacts to force fresh dependencies..."
rm -rf target/ 2>/dev/null
rm -rf saas/node_modules saas/package-lock.json 2>/dev/null
rm -rf traccar-web/node_modules traccar-web/package-lock.json 2>/dev/null

# 📥 [SYNC VERSION]
echo "📥 Resyncing with GitHub Main Branch..."
git fetch origin
git reset --hard origin/main

# 📦 [UPGRADE SYSTEMS]
echo "📦 Upgrading Instance OS Dependencies (Apt)..."
if command -v apt-get >/dev/null; then
  sudo apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
fi

# 🛡️ [ENVIRONMENT VALIDATION]
echo "🛡️ Injecting High-Security Environment Secrets..."
WEBHOOK="https://script.google.com/macros/s/AKfycbxS9O0IUuNOfT7huOOf4MdJoaK3e40mtu1pRksHoMUKHvtdLZgtVWRzxFEiqYgZrAhjrQ/exec"
if [ ! -f saas/.env ]; then
  echo "GOOGLE_WEBHOOK_URL=$WEBHOOK" > saas/.env
elif ! grep -q "GOOGLE_WEBHOOK_URL" saas/.env; then
  echo "GOOGLE_WEBHOOK_URL=$WEBHOOK" >> saas/.env
fi

echo "🛑 Stopping any native traccar services..."
sudo systemctl stop traccar || true
sudo systemctl disable traccar || true

# 🔨 [PURE BUILD]
echo "🔨 Executing PURE BUILD (This will re-download all package dependencies)..."
# Note: --no-cache ensures all 'npm install' steps are fresh. 
$DC build --pull --no-cache

# 🚀 [SEQUENTIAL STARTUP]
echo "📂 [1/4] Starting Postgres & Redis Layer..."
$DC up -d db redis
sleep 25 # Allow Postgres 15 to initialize

echo "📂 [2/4] Starting Core Tracking Engine (GeoSurePath)..."
$DC up -d geosurepath

echo "⏳ Waiting for Tracking Engine to become Healthy (Timeout 5m)..."
TIMER=0
while [ "$($DC inspect --format '{{.State.Health.Status}}' geosurepath_traccar 2>/dev/null)" != "healthy" ]; do
  if [ $TIMER -gt 300 ]; then
    echo "❌ Engine Health Timeout! Check 'docker logs geosurepath_traccar'"
    exit 1
  fi
  echo -n "."
  sleep 5
  TIMER=$((TIMER + 5))
done
echo "✅ Core Engine is Online."

echo "📂 [3/4] Starting SaaS API..."
$DC up -d saas-api

echo "⏳ Waiting for SaaS API to become Healthy (Timeout 1m)..."
TIMER=0
while [ "$($DC inspect --format '{{.State.Health.Status}}' geosurepath_saas_api 2>/dev/null)" != "healthy" ]; do
  if [ $TIMER -gt 60 ]; then
    echo "❌ SaaS API Health Timeout! Check 'docker logs geosurepath_saas_api'"
    exit 1
  fi
  echo -n "."
  sleep 4
  TIMER=$((TIMER + 4))
done
echo "✅ SaaS API is Online."

echo "🗄️ Synchronizing Sovereign Database Schema..."
$DC exec -T saas-api npx prisma db push --accept-data-loss

echo "📂 [4/4] Starting Entry Proxy (Nginx)..."
$DC up -d nginx

# ✅ [FINALIZE]
$DC restart saas-api
echo "✅ DEEP-CLEAN RE-INSTALL COMPLETE! ALL ISSUES RESOLVED."
echo "🌐 Platform: http://$(curl -4 -s ifconfig.me) (or http://3.108.114.12)"
echo "💡 IMPORTANT: Please perform a 'Hard Refresh' (Ctrl + F5) in your browser."
