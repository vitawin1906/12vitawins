# --- Builder Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Vite env variables
ARG VITE_API_URL=https://dev-api.vitawins.ru

# Set as ENV so Vite can pick it up during build
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .

# Build the app (VITE_API_URL will be inlined)
RUN npm run build

# --- Runner Stage ---
FROM nginx:alpine AS runner

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

