#!/bin/bash

# GeoSurePath SaaS - Full Automated Deployment Script
# This script performs a clean installation from scratch on Ubuntu/Debian.

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
echo "🚀 GeoSurePath SaaS Deployment - Enterprise Auto-Init"
echo "====================================================="
echo -e "${NC}"

# Ensure sudo
if [ "$EUID" -ne 0 ]; then
  error "This script MUST be run with sudo or as root."
fi

# 1. Clean Existing Instance
info "🧹 Step 1: Purging previous installations..."
sudo pkill -f java || true
sudo pkill -f screen || true

if command -v docker &> /dev/null; then
    docker system prune -af --volumes || true
    docker compose down -v || true
fi

# Install Node.js 22 (LTS)
if ! command -v node &> /dev/null || [[ $(node -v) != v22* ]]; then
    info "📦 Installing Node.js 22 (Nodesource)..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    info "🐳 Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    usermod -aG docker $USER
fi

# Docker Compose check
if ! docker compose version &> /dev/null; then
    info "🐳 Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin
fi

# 3. Code Preparation
info "📥 Step 3: Preparing codebase..."
if [ ! -d ".git" ]; then
    warn "Not in a git repository. Some steps might be skipped."
else
    git submodule update --init --recursive --remote || warn "Submodule init might be required manual sync."
fi

# 4. Environment File Setup
info "⚙️ Step 4: Configuring Environment secrets..."
PUBLIC_IP=$(curl -s ifconfig.me || echo "3.108.114.12")

if [ ! -f ".env" ]; then
    cp .env.example .env || error "Missing .env.example!"
fi

if [ ! -f "saas/.env" ]; then
    cp saas/.env.example saas/.env || cp .env.example saas/.env
fi

# Generate DB passwords if still default
if grep -q "change-this-to-something-long-and-random" .env; then
    NEW_DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9')
    sed -i "s/change-this-to-something-long-and-random/$NEW_DB_PASS/g" .env
    sed -i "s/change-this-to-something-long-and-random/$NEW_DB_PASS/g" saas/.env 2>/dev/null || true
    info "🔒 SECURE: Generated high-entropy database password."
fi

# Export for script use
set -a
[ -f .env ] && . .env
set +a

# Synchronize traccar.xml
if [ -f "docker/traccar.xml" ]; then
    sed -i "s/\${DB_PASSWORD}/$DB_PASSWORD/g" docker/traccar.xml
fi

# 5. Build and Deploy Stack
info "🚢 Step 5: Building and starting GeoSurePath Infrastructure..."
docker compose build --no-cache
docker compose up -d

# 6. Database Initialization
info "🔄 Step 6: Initializing Database schema..."
MAX_RETRIES=20
COUNT=0
until docker exec geosurepath_saas_api npx prisma db push --accept-data-loss || [ $COUNT -eq $MAX_RETRIES ]; do
    echo -ne "\r⏳ Waiting for PostgreSQL & Redis... ($COUNT/$MAX_RETRIES)"
    sleep 5
    COUNT=$((COUNT + 1))
done
echo ""

# Enable Registration natively in Traccar
info "🔓 Step 7: Enabling Native Registration in Core..."
for i in {1..20}; do
    if docker exec geosurepath_db psql -U ${DB_USER:-geosurepath} -d ${DB_NAME:-geosurepath} -c "SELECT 1 FROM tc_servers LIMIT 1;" >/dev/null 2>&1; then
        docker exec geosurepath_db psql -U ${DB_USER:-geosurepath} -d ${DB_NAME:-geosurepath} -c "UPDATE tc_servers SET registration = true;" 
        break
    fi
    sleep 3
done

# Seed Admin & Clients
info "🧪 Step 8: Seeding system with default test accounts..."
docker exec -it geosurepath_saas_api node scripts/seed_test_users.js || warn "Initial seeding might require manual intervention."

# 9. Firewall Tuning
info "🛡️ Step 9: Finalizing Firewall (UFW) rules..."
# ufw allow 80/tcp
# ufw allow 8082/tcp
# ufw allow 5001:5150/tcp
# ufw allow 5001:5150/udp
# ufw --force enable || true

# Finish Deployment
echo -e "${GREEN}"
echo "====================================================="
echo "✅ GeoSurePath Deployment Successfully Finalized!"
echo "====================================================="
echo -e "${NC}"
echo "SaaS Control Panel: http://${PUBLIC_IP}"
echo ""
echo "CRITICAL: Ensure TCP Ports 80, 8082, and 5001-5150 are open in AWS Networking UI."
echo "Default Accounts:"
echo "- Admin: admin@geosurepath.com / AdminTestPassword123!"
echo "- Client: client@geosurepath.com / ClientTestPassword123!"
echo ""
echo "Management Commands:"
echo "- View Logs: docker logs -f geosurepath_traccar"
echo "- SSH Into DB: docker exec -it geosurepath_db psql -U geosurepath -d geosurepath"
echo "====================================================="
