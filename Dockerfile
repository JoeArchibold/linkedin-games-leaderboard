# ── Stage 1: build ──────────────────────────────────────────────────────────────
# Install dependencies and run `next build`, which emits the production server
# plus a self-contained `standalone` bundle under /app/.next/standalone.
FROM node:22-alpine AS builder

# pin the exact pnpm version the repo declares (packageManager: pnpm@11.25.0)
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /app

# Copy manifests + the pnpm workspace policy first so dependency install is
# cached as its own layer and only re-runs when these change. pnpm-workspace.yaml
# is required: its `allowBuilds` policy is what stops pnpm's strictDepBuilds from
# failing on deps that ship build scripts (e.g. unrs-resolver).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the full source tree and build. The app intentionally builds without
# DATABASE_URL or LEADERBOARD_INGEST_TOKEN (they are read lazily at runtime).
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ── Stage 2: runtime ────────────────────────────────────────────────────────────
# Only the standalone bundle + Node. No pnpm, no dev deps, no source.
FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Bind to all interfaces inside the container (Hostname 0.0.0.0). Exposure to the
# host/LAN is controlled by docker-compose's `ports:` mapping, not this line.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

# Copy the traced standalone server, the compiled static assets, and the public
# static files Next serves. `output: standalone` traces server deps (incl. `pg`)
# into .next/standalone/node_modules.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Run as the built-in, non-root `node` user (not root) for minimal privileges.
USER node

EXPOSE 3000
CMD ["node", "server.js"]
