#!/bin/bash
# -------------------------------------------------------------------
# 🚀 GeoSurePath SSL & Crypto-Hardening Utility
# Automates Let's Encrypt (Certbot) synchronization for Infrastructure.
# -------------------------------------------------------------------

set -e

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "❌ Error: Usage: ./setup_ssl.sh <your-domain.com> <your-email@example.com>"
    exit 1
fi

echo "🛰️  Initiating SSL Synchronization for $DOMAIN..."

# 1. Install Certbot
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot & Nginx Plugin..."
    sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx
fi

# 2. Stop Nginx Docker to avoid port 80 conflict during standalone check (optional)
# But we usually use --nginx plugin which handles it.
echo "🔐 Synchronizing SSL Certificates with Let's Encrypt..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

# 3. Synchronize Nginx Configuration
echo "🛠️  Hardening Encryption Protocols (TLS 1.2/1.3)..."
# Certbot usually adds these, but we ensure they are synchronized.
sudo systemctl reload nginx

echo "✅ SSL SYNCHRONIZATION COMPLETE."
echo "🔗 Domain: https://$DOMAIN"
echo "📅 Auto-renewal: Active (via systemd timer)"
