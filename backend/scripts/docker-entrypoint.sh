#!/bin/sh
set -e

echo "🚀 Starting VitaWin backend..."

# Run database migrations using tsx for TypeScript config
echo "📦 Running database migrations..."
npx drizzle-kit migrate 2>&1 || {
    echo "⚠️ Migration failed, but continuing startup..."
}

# Run idempotent seed (safe to run every time)
# Disable with SKIP_SEED=true if needed
if [ "${SKIP_SEED:-false}" != "true" ]; then
    echo "🌱 Running idempotent database seed..."
    npx tsx src/db/seed.ts 2>&1 || echo "⚠️ Seed failed, continuing anyway..."
fi

echo "✅ Startup complete, starting server..."

# Start the application with tsx for ESM support
exec npx tsx dist/index.js
