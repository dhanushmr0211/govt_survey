# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# --- Production Stage ---
FROM node:22-alpine AS production

WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only production node_modules and source code
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Remove dev-only files that were copied
RUN rm -rf migrate_all.js migrate_seed.js create_admin.js fix_admin_access_constraint.js \
    apply_projects_schema.js enable_pg_trgm.js dump.sql

# Set ownership to the non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Cloud Run provides the PORT env var (default 3000 in your config)
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]
