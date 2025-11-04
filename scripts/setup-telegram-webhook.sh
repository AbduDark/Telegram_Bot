#!/usr/bin/env bash

set -e

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ Error: TELEGRAM_BOT_TOKEN environment variable is not set"
  exit 1
fi

if [ -z "$REPLIT_DEV_DOMAIN" ]; then
  echo "❌ Error: REPLIT_DEV_DOMAIN environment variable is not set"
  exit 1
fi

WEBHOOK_URL="https://${REPLIT_DEV_DOMAIN}/webhooks/telegram/action"

echo "🔧 Setting up Telegram webhook..."
echo "📍 Webhook URL: ${WEBHOOK_URL}"

RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo "📡 Response: ${RESPONSE}"

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Webhook setup successful!"
  
  echo ""
  echo "🔍 Getting webhook info..."
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | jq .
else
  echo "❌ Webhook setup failed!"
  exit 1
fi
