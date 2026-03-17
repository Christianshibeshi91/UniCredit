# ─── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package manifests only for layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ─── Stage 2: Production image ─────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S stitch && \
    adduser -S stitch -u 1001 -G stitch

# Copy dependencies from builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy application source
COPY src/ ./src/
COPY server.js ./server.js
COPY jsconfig.json ./jsconfig.json

# Environment defaults (override at runtime)
ENV NODE_ENV=production
ENV PORT=3000

# Health check — hits /api/health every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER stitch

EXPOSE 3000

CMD ["node", "server.js"]
