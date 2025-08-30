# 🐳 Agentic Boardroom - Production Docker Image
# Architecting sustainable systems to elevate humanity
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Run security audit before production
RUN npm run security:check

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/ui ./ui
COPY --from=builder /app/configs ./configs
COPY --from=builder /app/teams ./teams
COPY --from=builder /app/overlord ./overlord
COPY --from=builder /app/schema ./schema
COPY --from=builder /app/policies ./policies
COPY --from=builder /app/infrastructure ./infrastructure
COPY --from=builder /app/scripts ./scripts

# Copy additional necessary files
COPY README.md ./
COPY DEPLOYMENT_GUIDE.md ./

# Create necessary directories
RUN mkdir -p /app/logs && \
    mkdir -p /app/uploads && \
    mkdir -p /app/backups

# Set correct permissions
RUN chown -R appuser:appuser /app && \
    chmod -R 755 /app/scripts

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/index.js"]


