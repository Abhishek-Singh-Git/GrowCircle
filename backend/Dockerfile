# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache openssl python3 make g++

# Install all dependencies and build
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# Production Stage
FROM node:22-alpine

WORKDIR /app

# Prisma needs openssl
RUN apk add --no-cache openssl

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci --omit=dev

# Generate Prisma client for production
RUN npx prisma generate

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main"]
