#!/bin/bash
# -------------------------------------------------------------------
# 🚀 GeoSurePath "Hyper-Sync" Re-Installation Script
# Purpose: Wipes all old containers, rebuilds the entire stack with 
#          the latest 18+ Alerts, 3D Dynamic Markers, & Billing Hub.
# -------------------------------------------------------------------

echo "🛑 Stopping and Removing current GeoSurePath containers..."
docker-compose down --remove-orphans || true

echo "📥 Resyncing with GitHub Main Branch (Strict)..."
git fetch origin
git reset --hard origin/main

echo "🛑 Stopping any native traccar services..."
sudo systemctl stop traccar || true
sudo systemctl disable traccar || true

echo "🛡️ Injecting High-Security Environment Secrets..."
# Ensure the Google Hook is injected if missing
if ! grep -q "GOOGLE_WEBHOOK_URL" saas/.env; then
  echo "GOOGLE_WEBHOOK_URL=https://script.google.com/macros/s/AKfycbxS9O0IUuNOfT7huOOf4MdJoaK3e40mtu1pRksHoMUKHvtdLZgtVWRzxFEiqYgZrAhjrQ/exec" >> saas/.env
fi

echo "🔨 Executing FAST-BUILD (Using Cache)..."
docker-compose build

echo "🚀 Launching Production Stack..."
docker-compose up -d

echo "🗄️ Synchronizing Sovereign Database Schema..."
docker-compose exec -T saas-api npx prisma db push --accept-data-loss
docker-compose restart saas-api

echo "✅ RE-INSTALL COMPLETE!"
echo "🌐 Platform: http://$(curl -s ifconfig.me)"
echo "💡 IMPORTANT: Please perform a 'Hard Refresh' (Ctrl + F5) in your browser now."
