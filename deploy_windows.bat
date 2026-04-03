@echo off
echo 🚀 Starting GeoSurePath Deep-Clean Reinstallation...
cd /d "%~dp0"

echo 🧹 Purging old data and volumes...
docker-compose down -v

echo 🐳 Rebuilding and launching containers...
docker-compose up -d --build

echo ⏳ Waiting for SaaS API to initialize (30s)...
timeout /t 30 /nobreak > nul

echo 💎 Initializing Master Identities...
docker exec -it traccar_saas_api node scripts/init_admin.js

echo ✅ Deployment Complete!
echo 🌐 Login at http://localhost
echo 📧 User: admin@traccar.com
echo 🔑 Pass: AdminTestPassword123!
pause
