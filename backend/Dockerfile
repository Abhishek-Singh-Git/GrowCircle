# Single-stage build — ensures all dependencies are available at runtime
FROM node:22-alpine

WORKDIR /app

# Install build tools for native modules (bcrypt, sharp, etc.)
RUN apk add --no-cache openssl python3 make g++

# Copy package files and install ALL dependencies
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (Railway overrides with PORT env var)
EXPOSE 3001

# Start the application
CMD ["node", "dist/main"]
