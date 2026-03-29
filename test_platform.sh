#!/bin/bash
# test_platform.sh - End-to-End Platform Verification

echo "🧪 Starting Platform E2E Verification..."
TIMESTAMP=$(date +%s)
EMAIL="testuser_${TIMESTAMP}@example.com"
PASSWORD="TestPass123"

echo "1. Testing Registration..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test User\", \"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | grep -q "Registration successful"; then
    echo "✅ Registration: Success"
else
    echo "❌ Registration: Failed! Response: $REGISTER_RESPONSE"
    exit 1
fi

echo "2. Testing Login..."
# Use cookie-jar to capture session cookies
LOGIN_RESPONSE=$(curl -s -i -X POST http://localhost/api/auth/login \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "Login successful"; then
    echo "✅ Login: Success"
else
    echo "❌ Login: Failed! Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "3. Testing Session Sync..."
SYNC_RESPONSE=$(curl -s -X GET http://localhost/api/auth/sync \
  -b cookies.txt \
  -H "Content-Type: application/json")

if echo "$SYNC_RESPONSE" | grep -q "Session synchronized"; then
    echo "✅ Session Sync: Success"
else
    echo "❌ Session Sync: Failed! Response: $SYNC_RESPONSE"
    exit 1
fi

echo "🎉 ALL CORE TESTS PASSED!"
rm cookies.txt
