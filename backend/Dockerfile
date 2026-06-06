# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for Prisma and build tools
RUN apk add --no-cache openssl

# Copy package and lock file
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci --only=production

# Generate Prisma client for production
RUN npx prisma generate

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose port (Railway overrides this with PORT env var)
EXPOSE 3001

# Start the application
CMD ["node", "dist/main"]
