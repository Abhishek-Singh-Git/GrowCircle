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

# Prune devDependencies to keep node_modules minimal and production-ready
RUN npm prune --omit=dev

# Production Stage
FROM node:22-alpine

WORKDIR /app

# Prisma/Postgres native client needs openssl
RUN apk add --no-cache openssl

# Copy package configurations
COPY package*.json ./
COPY prisma ./prisma/

# Copy pre-built production dependencies (including compiled native modules like bcrypt)
COPY --from=builder /app/node_modules ./node_modules
# Copy compiled NestJS application code
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main"]
