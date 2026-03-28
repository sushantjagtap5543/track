#!/bin/bash
# -------------------------------------------------------------------
# 🚀 GeoSurePath "One-Click" Enterprise Deployment Script
# Supports: Ubuntu 22.04 / 24.04 / Debian
# -------------------------------------------------------------------

set -e

echo "🛰️  Initializing GeoSurePath SaaS Platform..."

# 1. Check for Docker & Install if missing
if ! command -v docker &> /dev/null; then
    echo "📦 Docker not found. Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed successfully."
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

# 2. Environment Setup
if [ ! -f .env ]; then
    echo "🔐 Bootstrapping environment secrets from .env.example..."
    cp .env.example .env
    # Generate random passwords if they are placeholders
    sed -i "s/change-this-to-something-very-strong-and-unique/$(openssl rand -hex 16)/g" .env
    sed -i "s/your-super-secret-jwt-key/$(openssl rand -hex 32)/g" .env
    echo "✅ .env initialized with secure random secrets."
fi

# 3. Clean up existing deployments (Optional but recommended for "clean" install)
echo "🧹 Cleaning up legacy artifacts..."
$DC down --remove-orphans --volumes || true
rm -rf logs/* data/* 2>/dev/null || true

# 4. Launch Ecosystem
echo "🧱 Building and Launching Containers (this may take a few minutes)..."
$DC up -d --build

# 5. Verification & Health Check
echo "⏳ Waiting for platform to stabilize..."
TIMER=0
while [ "$($DC inspect --format '{{.State.Health.Status}}' geosurepath_nginx 2>/dev/null)" != "healthy" ]; do
    if [ $TIMER -gt 600 ]; then
        echo "❌ Deployment Timeout! Please check 'docker compose logs'."
        exit 1
    fi
    echo -n "."
    sleep 10
    TIMER=$((TIMER + 10))
done

echo -e "\n✅  GEOSUREPATH SAAS IS LIVE!"
IP=$(curl -4 -s ifconfig.me || echo "your-ip")
echo "----------------------------------------------------"
echo "🌐 Dashboard: http://$IP"
echo "📧 Admin:     admin@geosurepath.com"
echo "🔑 Password:  admin123 (Default)"
echo "----------------------------------------------------"
echo "💡 To view logs: docker compose logs -f"
echo "💡 To stop:      docker compose down"
