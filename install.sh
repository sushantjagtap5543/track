#!/bin/bash

# Exit on any error
set -e

echo "----------------------------------------------------"
echo "START Starting GeoSurePath Deployment on Clean Instance"
echo "----------------------------------------------------"

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
    echo "⚠️  Note: Docker group changes require a logout/login to take effect in the current shell."
else
    echo "✅ Docker is already installed."
fi

# 3. Install Docker Compose (Modern plugin is usually included with docker-ce)
if ! docker compose version &> /dev/null; then
    echo "🐙 Installing Docker Compose Plugin..."
    sudo apt-get install -y docker-compose-plugin
else
    echo "✅ Docker Compose is already installed."
fi

# 4. Deep Clean (Optional but requested for 'clean instance')
echo "🧹 Performing deep clean of Docker resources (images and containers)..."
docker system prune -af || true

# 5. Set up Environment
echo "SETTING Setting up environment..."
if [ ! -f "saas/.env" ]; then
    echo "FAIL Error: saas/.env not found. Deployment aborted."
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "FAIL Error: Root .env not found. Deployment aborted."
    exit 1
fi

# Load root .env and check DB_PASSWORD
export $(grep -v '^#' .env | xargs)
if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" == "change-this-to-something-long-and-random" ]; then
    echo "FAIL Error: DB_PASSWORD is not set or still has the placeholder value in .env."
    echo "Please set a strong, unique password in the root .env file."
    exit 1
fi

# 6. Inject DB_PASSWORD into Traccar config
echo "🔑 Injecting database password into Traccar config..."
sed -i "s/\${DB_PASSWORD}/$DB_PASSWORD/g" docker/traccar.xml

# 7. Deploy with Docker Compose
echo "🚢 Deploying all services..."
docker compose down --remove-orphans || true
docker compose up -d --build

echo "🔄 Running database migrations..."
echo "⏳ Waiting for database and API to be ready (up to 60s)..."
MAX_RETRIES=30
RETRY_COUNT=0
until docker exec geosurepath_saas_api npx prisma migrate deploy || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
    echo "⏳ Database not ready yet, retrying in 2s... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Migration failed after multiple attempts."
    exit 1
fi

echo "----------------------------------------------------"
echo "✅ Deployment Complete!"
echo "----------------------------------------------------"
echo "Application: http://$(curl -s ifconfig.me)"
echo "----------------------------------------------------"
echo "Note: All services are behind Nginx. No raw ports are exposed."
echo "----------------------------------------------------"
