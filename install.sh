#!/bin/bash
# -------------------------------------------------------------------
# 🚀 GeoSurePath "Hyper-Sync" Re-Installation Script
# Purpose: Wipes all old containers, rebuilds the entire stack with 
#          the latest 18+ Alerts, 3D Dynamic Markers, & Billing Hub.
# -------------------------------------------------------------------

echo "🛑 Stopping and Removing ALL old GeoSurePath containers & networks..."
docker-compose down --rmi all --volumes --remove-orphans || true
docker container prune -f
docker network prune -f

echo "📥 Resyncing with GitHub Main Branch (Strict)..."
git fetch origin
git reset --hard origin/main

echo "🛡️ Injecting High-Security Environment Secrets..."
# Ensure the Google Hook is injected if missing
if ! grep -q "GOOGLE_WEBHOOK_URL" saas/.env; then
  echo "GOOGLE_WEBHOOK_URL=https://script.google.com/macros/s/AKfycbxS9O0IUuNOfT7huOOf4MdJoaK3e40mtu1pRksHoMUKHvtdLZgtVWRzxFEiqYgZrAhjrQ/exec" >> saas/.env
fi

echo "🔨 Executing HYPER-REBUILD (No Cache/Deep Build)..."
docker-compose build --no-cache

echo "🚀 Launching Production Stack (Force Recreate)..."
docker-compose up -d --force-recreate


echo "✅ RE-INSTALL COMPLETE!"
echo "🌐 Platform: http://$(curl -s ifconfig.me)"
echo "💡 IMPORTANT: Please perform a 'Hard Refresh' (Ctrl + F5) in your browser now."
