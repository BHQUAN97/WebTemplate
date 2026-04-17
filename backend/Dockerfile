# ============================================
# Stage 1: Builder — install deps + compile TS
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install all deps (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build NestJS project
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# ============================================
# Stage 2: Production — minimal runtime image
# ============================================
FROM node:20-alpine AS production

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy built artifacts and production deps
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Create uploads directory
RUN mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads

# Switch to non-root user
USER nestjs

# Expose API port
EXPOSE 6001

# Health check — ping API root
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:6001/api || exit 1

CMD ["node", "dist/main.js"]
