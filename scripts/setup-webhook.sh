#!/bin/bash

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ Error: TELEGRAM_BOT_TOKEN not found in .env file"
  echo "Please add your Telegram bot token to .env:"
  echo "TELEGRAM_BOT_TOKEN=your_token_here"
  exit 1
fi

if [ -z "$TELEGRAM_WEBHOOK_URL" ]; then
  echo "❌ Error: TELEGRAM_WEBHOOK_URL not found in .env file"
  echo "Please add your webhook URL to .env:"
  echo "TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Setting up Telegram Webhook"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Bot Token: ${TELEGRAM_BOT_TOKEN:0:15}..."
echo "Webhook URL: $TELEGRAM_WEBHOOK_URL"
echo ""

API_URL="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook"

response=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$TELEGRAM_WEBHOOK_URL\"}")

echo "Response from Telegram API:"
# Use jq if available, otherwise just print raw response
if command -v jq &> /dev/null; then
  echo "$response" | jq '.'
else
  echo "$response"
  echo "(Install 'jq' for pretty-printed JSON: sudo apt install jq)"
fi
echo ""

if echo "$response" | grep -q '"ok":true'; then
  echo "✅ Webhook configured successfully!"
  echo ""
  echo "📡 Testing webhook info..."
  
  INFO_URL="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
  info_response=$(curl -s "$INFO_URL")
  
  # Use jq if available, otherwise just print raw response
  if command -v jq &> /dev/null; then
    echo "$info_response" | jq '.'
  else
    echo "$info_response"
  fi
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Setup complete!"
  echo "Your bot is now ready to receive messages."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "❌ Failed to set webhook"
  echo "Please check your bot token and webhook URL"
  exit 1
fi
