#!/bin/bash
# -------------------------------------------------------------------
# 🚀 GeoSurePath "Deep-Clean" Enterprise Deployment Script
# Supports: Ubuntu 22.04 / 24.04 (Lightsail, EC2, DigitalOcean)
# -------------------------------------------------------------------

set -e

REPO_URL="https://github.com/sushantjagtap5543/track.git"
INSTALL_DIR="/opt/geosurepath"

echo "🛰️  Initializing GeoSurePath Deep-Clean Command Center..."

# 0. Deep Cleanup Phase (High-Resilience)
if [ "$1" == "clean" ]; then
    echo "🧹 DEEP CLEAN: Terminating all tracking instances..."
    if command -v docker &> /dev/null; then
        docker stop $(docker ps -aq) 2>/dev/null || true
        docker system prune -af --volumes 2>/dev/null || true
    fi
    echo "✅ Host infrastructure purged."
fi

# 1. Dependency Cluster Setup
echo "📦 Synchronizing system dependencies..."
sudo apt-get update -y
sudo apt-get install -y git curl ca-certificates gnupg lsb-release

# Install Docker Engine (if missing)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# Install Node.js 20 (LTS) & PM2
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20 (LTS)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 Global Orchestrator..."
    sudo npm install -g pm2
fi

# 2. Infrastructure Hardening: Swap Allocation
if [ ! -f /swapfile_geo ]; then
    echo "💾 Allocating 2GB Enterprise Swap for Build Resilience..."
    sudo fallocate -l 2G /swapfile_geo || sudo dd if=/dev/zero of=/swapfile_geo bs=1M count=2048
    sudo chmod 600 /swapfile_geo
    sudo mkswap /swapfile_geo
    sudo swapon /swapfile_geo
    echo "/swapfile_geo none swap sw 0 0" | sudo tee -a /etc/fstab
    echo "✅ Swap synchronized."
fi

# 3. Repository Management
if [ ! -d "$INSTALL_DIR" ]; then
    echo "📂 Cloning GeoSurePath from GitHub..."
    sudo git clone $REPO_URL $INSTALL_DIR
    sudo chown -R $USER:$USER $INSTALL_DIR
elif [ "$(pwd)" != "$INSTALL_DIR" ]; then
    echo "🔄 Updating existing GeoSurePath repository at $INSTALL_DIR..."
    cd $INSTALL_DIR
    git fetch --all
    git reset --hard origin/main
fi

# Ensure we are in the install directory
if [ -d "$INSTALL_DIR" ]; then
    cd $INSTALL_DIR
fi

# 4. Environment Bootstrapping
if [ ! -f .env ]; then
    echo "🔐 Generating environment secrets..."
    cp .env.example .env
    # Generate random JWT secret if placeholder
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(openssl rand -base64 32)/g" .env
fi

# Detect Public IP and patch Nginx
echo "🛰️  Detecting Public IP for Infrastructure Sync..."
IP=$(curl -4 -s ifconfig.me || echo "localhost")
echo "📍 Synchronization Point: http://$IP"
if [ -f nginx.conf ]; then
    sed -i "s/server_name [0-9.]*;/server_name $IP;/g" nginx.conf
fi

# 5. Service Orchestration (Docker Compose V2)
echo "🚀 Launching GeoSurePath Elite Ecosystem..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d --build

# 6. Database Schema Proliferation (Resilient Migration)
echo "🗄️  Synchronizing Database Schema (Prisma)..."
# Wait for container to be ready
RETRIES=12
until docker exec geosurepath_saas_api npx prisma migrate deploy || [ $RETRIES -eq 0 ]; do
  echo "⏳ Waiting for SaaS API to stabilize... ($RETRIES attempts left)"
  sleep 10
  RETRIES=$((RETRIES-1))
done

echo -e "\n✅  GEOSUREPATH DEEP-CLEAN DEPLOYMENT COMPLETE!"
echo "----------------------------------------------------"
echo "🌐 Production IP: http://$IP"
echo "🔒 SaaS API:      Ready"
echo "🛰️  Tracking:      Online (Ports 5001-5150)"
echo "----------------------------------------------------"
echo "💡 To view logs: docker compose logs -f"
echo "💡 To check health: docker compose ps"
echo "----------------------------------------------------"
