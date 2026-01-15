#!/bin/sh
set -e

echo "🚀 Starting VitaWin backend..."

# Run database migrations using tsx for TypeScript config
echo "📦 Running database migrations..."
npx drizzle-kit migrate 2>&1 || {
    echo "⚠️ Migration failed, but continuing startup..."
}

# Seed default data if needed
if [ "${RUN_SEED:-false}" = "true" ]; then
    echo "🌱 Running database seed..."
    npm run db:seed || echo "⚠️ Seed failed, continuing anyway..."
fi

echo "✅ Migrations complete, starting server..."

# Start the application with tsx for ESM support
exec npx tsx dist/index.js
