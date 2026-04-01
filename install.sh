#!/bin/bash
# -------------------------------------------------------------------
# 🚀 GeoSurePath "Elite" Enterprise Deployment & Hardening Script
# Supports: Ubuntu 22.04 / 24.04 (Lightsail & EC2 Optimized)
# -------------------------------------------------------------------

set -e

echo "🛰️  Initializing GeoSurePath Elite Command Center..."

# 1. Infrastructure Hardening: Swap Allocation (Critical for Builds)
if [ ! -f /swapfile_geo ]; then
    echo "💾 Allocating 2GB Enterprise Swap for Build Resilience..."
    sudo fallocate -l 2G /swapfile_geo
    sudo chmod 600 /swapfile_geo
    sudo mkswap /swapfile_geo
    sudo swapon /swapfile_geo
    echo "/swapfile_geo none swap sw 0 0" | sudo tee -a /etc/fstab
    echo "✅ Swap synchronized."
fi

# 2. Dependency Check: Node.js & PM2
if ! command -v node &> /dev/null; then
    echo "📦 Node.js not found. Installing LTS version..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 Global Orchestrator..."
    sudo npm install -g pm2
fi

# 3. Environment Synchronization
if [ ! -f .env ]; then
    echo "🔐 Bootstrapping environment secrets..."
    cp .env.example .env
fi

# Detect Docker Compose V2
if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
else
    echo "📦 Installing Docker Compose..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
    DC="docker compose"
fi

# 4. Service Orchestration (Docker)
echo "🚀 Launching GeoSurePath Elite Ecosystem..."
$DC down --remove-orphans 2>/dev/null || true
$DC up -d --build

# 5. Database Schema Proliferation (Inside Container)
echo "🗄️  Synchronizing Database Schema (Prisma)..."
docker exec geosurepath_saas_api npx prisma migrate deploy

echo -e "\n✅  GEOSUREPATH ELITE IS LIVE!"
IP=$(curl -4 -s ifconfig.me || echo "3.108.114.12")
echo "----------------------------------------------------"
echo "🌐 Production IP: http://$IP"
echo "🔒 SSL Status:    Awaiting Nginx Certbot"
echo "📧 Support:       support@geosurepath.com"
echo "----------------------------------------------------"
echo "💡 To view logs: $DC logs -f"
echo "💡 To monitor:  $DC ps"
