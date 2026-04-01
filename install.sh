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

# Fix DATABASE_URL for local execution (host-based Prisma & PM2)
patch_env() {
    local target="$1"
    if [ -f "$target" ]; then
        if grep -q "db:5432" "$target"; then
            echo "🔧 Patching DATABASE_URL in $target for local execution..."
            sed -i "s/db:5432/localhost:5432/g" "$target"
        fi
    fi
}

patch_env ".env"
patch_env "saas/.env"
patch_env "production.env"

# 4. Database Schema Proliferation
echo "🗄️  Synchronizing Database Schema (Prisma)..."
(cd saas && npm install && npx prisma migrate deploy)

# 5. Frontend Production Compilation
echo "🏗️  Compiling High-Velocity Frontend Bundle..."
(cd traccar-web && npm install && npm run build)

# 6. Service Orchestration
echo "🚀 Launching Enterprise Daemons..."
pm2 delete saas-backend 2>/dev/null || true
pm2 start saas/index.js --name saas-backend --cwd $(pwd)
pm2 save

echo -e "\n✅  GEOSUREPATH ELITE IS LIVE!"
IP=$(curl -4 -s ifconfig.me || echo "3.108.114.12")
echo "----------------------------------------------------"
echo "🌐 Production IP: http://$IP"
echo "🔒 SSL Status:    Awaiting Nginx Certbot"
echo "📧 Support:       support@geosurepath.com"
echo "----------------------------------------------------"
echo "💡 To view logs: pm2 logs saas-backend"
echo "💡 To monitor:  pm2 monit"
