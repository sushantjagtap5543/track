#!/bin/bash

# GeoSurePath SaaS - Full Automated Deployment Script
# This script performs a clean installation from scratch.

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo -e "${GREEN}"
echo "====================================================="
echo "🚀 GeoSurePath SaaS Deployment - Clean & Install"
echo "====================================================="
echo -e "${NC}"

# 1. Clean Existing Instance
info "🧹 Step 1: Cleaning previous installations and processes..."
# Stop and disable any running java traccar processes
sudo pkill -f java || true
sudo pkill -f screen || true
# Stop all docker containers and prune
if command -v docker &> /dev/null; then
    docker system prune -af --volumes || true
fi
# Clear old logs if they exist
rm -rf logs data || true

# 2. System Prerequisites
info "📦 Step 2: Installing system pre-requirements (Docker, Git, Node)..."
sudo apt-get update -y > /dev/null
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git curl wget software-properties-common iptables screen > /dev/null

if ! command -v docker &> /dev/null; then
    info "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh > /dev/null
    rm get-docker.sh
    sudo usermod -aG docker $USER
fi

# Ensure docker compose is available
if ! docker compose version &> /dev/null; then
    info "🐳 Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin > /dev/null
fi

# 3. Code Preparation
info "📥 Step 3: Initializing submodules and preparing codebase..."
git pull origin main || true
git submodule update --init --recursive --remote || warn "Submodules taking time or already initialized."

# 4. Environment File Setup
info "⚙️ Step 4: Configuring Environment files..."
PUBLIC_IP=$(curl -s ifconfig.me || echo "127.0.0.1")

if [ ! -f ".env" ]; then
    cp .env.example .env || error "Missing .env.example!"
fi

if [ ! -f "saas/.env" ]; then
    cp saas/.env.example saas/.env || cp .env.example saas/.env
fi

# Generate DB passwords
if grep -q "change-this-to-something-long-and-random" .env; then
    NEW_DB_PASS=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')
    sed -i "s/change-this-to-something-long-and-random/$NEW_DB_PASS/g" .env
    sed -i "s/change-this-to-something-long-and-random/$NEW_DB_PASS/g" saas/.env 2>/dev/null || true
fi
export $(grep -v '^#' .env | xargs)

# Sync DB_PASSWORD to traccar config
if [ -f "docker/traccar.xml" ]; then
    sed -i "s/\${DB_PASSWORD}/$DB_PASSWORD/g" docker/traccar.xml
fi

# 5. Build and Deploy Traccar Stack
info "🚢 Step 5: Building and starting services via Docker Compose..."
# We run docker compose up in detached mode. This handles Traccar backend, frontend, Postgres, SaaS API, Redis and Nginx.
docker compose down -v --remove-orphans || true
docker compose up -d --build

# 6. Database Initialization
info "🔄 Step 6: Initializing Database & Prisma schemas..."
MAX_RETRIES=15
COUNT=0
# Wait for the DB to be fully ready before pushing saas schema
until docker exec geosurepath_saas_api npx prisma db push --accept-data-loss || [ $COUNT -eq $MAX_RETRIES ]; do
    echo -ne "\r⏳ Waiting for DB to be ready... ($COUNT/$MAX_RETRIES)"
    sleep 3
    COUNT=$((COUNT + 1))
done
echo ""

# Enable Registration natively in Traccar DB server preferences
info "🔓 Step 7: Enabling Admin/Client Registration..."
for i in {1..15}; do
    if docker exec geosurepath_db psql -U ${DB_USER:-geosurepath} -d ${DB_NAME:-geosurepath} -c "SELECT 1 FROM tc_users LIMIT 1;" >/dev/null 2>&1; then
        docker exec geosurepath_db psql -U ${DB_USER:-geosurepath} -d ${DB_NAME:-geosurepath} -c "UPDATE tc_servers SET registration = true;" > /dev/null 2>&1
        break
    fi
    sleep 2
done

# Seed Admin & Clients automatically for testing
info "🧪 Step 8: Seeding Admin & default test accounts..."
docker exec -it geosurepath_saas_api node scripts/seed_test_users.js || warn "Seeding testing users skipped or failed."

# Finish Deployment
echo -e "${GREEN}"
echo "====================================================="
echo "✅ GeoSurePath Full Deployment Complete!"
echo "====================================================="
echo -e "${NC}"
echo "Dashboard / SaaS Panel :  http://${PUBLIC_IP}"
echo ""
echo "Make sure TCP Port 80 and 8082 are OPEN in AWS Lightsail Networking!"
echo "Default Accounts created:"
echo "- Admin: admin@geosurepath.com / AdminTestPassword123!"
echo "- Client: client@geosurepath.com / ClientTestPassword123!"
echo "To view database:    docker exec -it geosurepath_db psql -U geosurepath -d geosurepath"
echo "To view server logs: docker logs -f geosurepath_traccar"
echo "====================================================="
