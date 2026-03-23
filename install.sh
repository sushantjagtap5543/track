#!/bin/bash

# GeoSurePath SaaS - Modernized Deployment Script
# This script automates the installation of Docker, dependencies, 
# environment configuration, and service deployment.

# Exit on any error
set -e

# Output colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo -e "${GREEN}"
echo "----------------------------------------------------"
echo "🚀 Starting GeoSurePath SaaS Deployment"
echo "----------------------------------------------------"
echo -e "${NC}"

# 1. Update System
info "📦 Updating system packages..."
sudo apt-get update -y > /dev/null

# 2. Install Docker & Plugins
if ! command -v docker &> /dev/null; then
    info "🐳 Installing Docker..."
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common > /dev/null
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y > /dev/null
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin > /dev/null
    sudo usermod -aG docker $USER
    warn "Docker group changes require a logout/login to take effect in the current shell."
else
    info "✅ Docker and Compose plugin are already installed."
fi

# 3. Deep Clean (Optional)
info "🧹 Performing deep clean of Docker resources..."
docker system prune -af --volumes || true

# 4. Environment Setup
info "⚙️ Setting up environment..."

# Detect Public IP
PUBLIC_IP=$(curl -s ifconfig.me || echo "localhost")
info "Detected Public IP: ${PUBLIC_IP}"

# Ensure .env files exist
if [ ! -f ".env" ]; then
    warn "Root .env not found. Creating from example..."
    cp .env.example .env || error "Could not create .env"
fi

if [ ! -f "saas/.env" ]; then
    warn "saas/.env not found. Creating from example..."
    cp saas/.env.example saas/.env || (cp .env.example saas/.env && warn "Used root example for saas/.env")
fi

# Generate strong password if needed
# Load root .env
if grep -q "change-this-to-something-long-and-random" .env; then
    NEW_DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    info "🛡️ Generating high-entropy database password..."
    sed -i "s/change-this-to-something-long-and-random/$NEW_DB_PASS/g" .env
    sed -i "s/change-this-to-something-long-and-random/$NEW_DB_PASS/g" saas/.env 2>/dev/null || true
fi

# Reload environment
export $(grep -v '^#' .env | xargs)

# 5. Inject DB_PASSWORD into GeoSurePath config
info "🔑 Syncing database configuration..."
if [ -f "docker/traccar.xml" ]; then
    sed -i "s/\${DB_PASSWORD}/$DB_PASSWORD/g" docker/traccar.xml
fi

# 6. Deploy with Docker Compose
info "🚢 Deploying services (this may take a few minutes)..."
docker compose down --remove-orphans || true
docker compose up -d --build

# 7. Database & Seeding
info "🔄 Initializing database schema..."
MAX_RETRIES=30
COUNT=0
until docker exec geosurepath_saas_api npx prisma db push --accept-data-loss || [ $COUNT -eq $MAX_RETRIES ]; do
    echo -ne "\r⏳ Database not ready yet, retrying... ($COUNT/$MAX_RETRIES)"
    sleep 2
    COUNT=$((COUNT + 1))
done
echo "" # New line after retries

# Enable Traccar Registration
info "🔓 Enabling Traccar user registration..."
# Wait for Traccar tables
for i in {1..15}; do
    if docker exec geosurepath_db psql -U ${DB_USER:-geosurepath} -d ${DB_NAME:-geosurepath} -c "SELECT 1 FROM tc_users LIMIT 1;" >/dev/null 2>&1; then
        docker exec geosurepath_db psql -U ${DB_USER:-geosurepath} -d ${DB_NAME:-geosurepath} -c "UPDATE tc_servers SET registration = true;" > /dev/null 2>&1
        info "✅ Registration enabled."
        break
    fi
    sleep 2
done

# 8. Run Seeding Script
info "🧪 Seeding testing accounts..."
docker exec -it geosurepath_saas_api node scripts/seed_test_users.js || warn "Seeding failed. You can run it manually later."

# 9. Final Summary
echo -e "${GREEN}"
echo "----------------------------------------------------"
echo "✅ GeoSurePath Deployment Complete!"
echo "----------------------------------------------------"
echo -e "${NC}"
echo "Application URL:  http://${PUBLIC_IP}"
echo "Registration:     http://${PUBLIC_IP}/register"
echo "Admin Panel:      http://${PUBLIC_IP}/"
echo ""
info "Standard Testing Credentials:"
echo " - Admin: admin@geosurepath.com / AdminTestPassword123!"
echo " - Client: client@geosurepath.com / ClientTestPassword123!"
echo "----------------------------------------------------"
info "Security Note: Database port 5432 is exposed for debugging."
echo "----------------------------------------------------"
