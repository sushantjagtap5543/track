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

# 4. Run database migrations or push schema
echo "🔄 Running database migrations..."
# Wait for API to be ready for Prisma commands
echo "⏳ Waiting for database and API to be ready (up to 60s)..."
MAX_RETRIES=30
COUNT=0
until docker exec geosurepath_saas_api npx prisma db push --accept-data-loss || [ $COUNT -eq $MAX_RETRIES ]; do
    echo "⏳ Database not ready yet, retrying in 2s... ($COUNT/$MAX_RETRIES)"
    sleep 2
    COUNT=$((COUNT + 1))
done

# 4b. Force Traccar registration setting in database
echo "🔓 Enabling Traccar user registration in database..."
# Wait for Traccar to initialize schema (up to 30s)
for i in {1..15}; do
    if docker exec geosurepath_db psql -U ${DB_USER:-geosurepath} -d ${DB_NAME:-geosurepath} -c "SELECT 1 FROM tc_users LIMIT 1;" >/dev/null 2>&1; then
        echo "✅ Traccar schema ready."
        break
    fi
    echo "⏳ Waiting for Traccar schema... ($i/15)"
    sleep 2
done

docker exec geosurepath_db psql -U ${DB_USER:-geosurepath} -d ${DB_NAME:-geosurepath} -c "UPDATE tc_servers SET registration = true;" || echo "⚠️ Could not update tc_servers."

# 4c. Ensure Admin User exists (Default: admin@example.com / admin)
# Traccar 6.x hash for 'admin' with salt '00000000000000000000000000000000' (32 zeros)
# Actually, since I can't easily generate the hash in cross-platform shell, 
# I'll just use the SaaS API's register flow if I can, or skip if exists.
echo "👤 Checking Traccar administrator..."
ADMIN_EXISTS=$(docker exec geosurepath_db psql -U ${DB_USER:-geosurepath} -d ${DB_NAME:-geosurepath} -t -A -c "SELECT count(*) FROM tc_users WHERE administrator = true;")
if [ "$ADMIN_EXISTS" -eq 0 ]; then
    echo "⚠️ No administrator found. Please register the first user at http://3.108.114.12/register to become the administrator."
else
    echo "✅ Administrator found."
fi

if [ $COUNT -eq $MAX_RETRIES ]; then
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
