FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Install all dependencies for build
RUN npm ci

COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies to reduce image size
RUN npm prune --production

# --- Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Copy drizzle folder for migrations if needed at runtime
COPY --from=builder /app/drizzle ./drizzle
# Copy bots if they are run from within this container (unlikely, they have their own), but maybe shared code?
# Assuming bots are separate.

ENV NODE_ENV=production
ENV PORT=8000

# Expose port
EXPOSE 8000

# Start command (без dotenv - переменные приходят от Dokploy)
CMD ["npm", "run", "start"]
