# Flux Explorer - Production Dockerfile
# Optimized multi-stage build for Flux deployment

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_BLOCKBOOK_API_URL=https://blockbookflux.app.runonflux.io/api/v2
ARG NEXT_PUBLIC_LOCAL_BLOCKBOOK_API_URL
ARG NEXT_PUBLIC_API_MODE=auto

# Make build args available as environment variables during build
ENV NEXT_PUBLIC_BLOCKBOOK_API_URL=$NEXT_PUBLIC_BLOCKBOOK_API_URL
ENV NEXT_PUBLIC_LOCAL_BLOCKBOOK_API_URL=$NEXT_PUBLIC_LOCAL_BLOCKBOOK_API_URL
ENV NEXT_PUBLIC_API_MODE=$NEXT_PUBLIC_API_MODE

# Build Next.js application
RUN npm run build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/LICENSE ./LICENSE

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
