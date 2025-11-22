#!/usr/bin/env bash

set -e

echo "🚀 Starting Production Server with Inngest..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

INNGEST_CONFIG=".config/inngest/inngest.yaml"

if [[ ! -f  "${INNGEST_CONFIG}" ]]; then
    mkdir -p "$(dirname "${INNGEST_CONFIG}")"
    if [[ -n "${DATABASE_URL}" ]]; then
        printf 'postgres-uri: "%s"' "${DATABASE_URL}" > "${INNGEST_CONFIG}"
        echo "✅ Configured Inngest with PostgreSQL"
    else
        printf 'sqlite-dir: "/home/runner/workspace/.local/share/inngest"' > "${INNGEST_CONFIG}"
        echo "✅ Configured Inngest with SQLite"
    fi
fi

echo "🔧 Starting Inngest server in background..."
NODE_ENV=production npx inngest-cli dev -u http://localhost:5000/api/inngest --host 127.0.0.1 --port 3000 --config "${INNGEST_CONFIG}" &
INNGEST_PID=$!

sleep 3

echo "✅ Inngest server started (PID: $INNGEST_PID)"
echo "🔧 Starting Production Server..."

NODE_ENV=production tsx src/production-server.ts &
SERVER_PID=$!

echo "✅ Production server started (PID: $SERVER_PID)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Both servers are running!"
echo "📍 Production Server: http://localhost:5000"
echo "📍 Inngest Server: http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cleanup() {
    echo ""
    echo "📴 Shutting down servers..."
    kill $INNGEST_PID 2>/dev/null || true
    kill $SERVER_PID 2>/dev/null || true
    echo "✅ Servers stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
