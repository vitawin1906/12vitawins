FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Install all dependencies for build
RUN npm ci

COPY . .

# Build TypeScript
RUN npm run build

# --- Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./

# Install production dependencies + drizzle-kit for migrations
RUN npm ci --omit=dev && npm install drizzle-kit

# Copy built files
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
# Copy drizzle folder for migrations
COPY --from=builder /app/drizzle ./drizzle
# Copy drizzle config
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
# Copy entrypoint script
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8000

# Expose port
EXPOSE 8000

# Use entrypoint script to run migrations before starting
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
