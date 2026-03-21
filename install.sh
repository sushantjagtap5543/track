#!/bin/bash

# Exit on any error
set -e

echo "----------------------------------------------------"
echo "🚀 Starting GeoSurePath Deployment on Clean Instance"
echo "----------------------------------------------------"

# 1. Update and Upgrade System
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
else
    echo "✅ Docker is already installed."
fi

# 3. Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "🐙 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "✅ Docker Compose is already installed."
fi

# 4. Deep Clean (Optional but requested for 'clean instance')
echo "🧹 Performing deep clean of Docker resources..."
docker system prune -af --volumes || true

# 5. Set up Environment
echo "⚙️  Setting up environment..."
if [ ! -f "saas/.env" ]; then
    echo "⚠️ Warning: saas/.env not found. Please ensure it is present."
fi

# 6. Deploy with Docker Compose
echo "🚢 Deploying all services one by one..."
docker-compose down --remove-orphans || true
docker-compose up -d --build

echo "----------------------------------------------------"
echo "✨ Deployment Complete! ✨"
echo "----------------------------------------------------"
echo "Nginx: http://$(curl -s ifconfig.me)"
echo "Traccar: http://$(curl -s ifconfig.me):8082"
echo "SaaS API: http://$(curl -s ifconfig.me):3001"
echo "----------------------------------------------------"
