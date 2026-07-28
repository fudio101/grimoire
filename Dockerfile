FROM node:26-alpine AS base
# Node 25+ no longer bundles corepack, so install it before enabling.
# corepack honours the `packageManager` pin in package.json.
RUN npm i -g corepack@latest && corepack enable
WORKDIR /app

# --- Build dependencies ---
# No `pnpm rebuild better-sqlite3` here: `vite build` never evaluates
# application modules, so the build does not open the database and does not
# need the native binary. Only the runtime stage does.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# --- Runtime dependencies ---
# The Vite SSR build leaves better-sqlite3 as a bare import rather than
# inlining it the way `.next/standalone` used to, so node_modules has to ship.
# better-sqlite3 13 dropped prebuild-install and always compiles from source,
# which is why the rebuild runs here, against this image's Node and libc.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && \
    pnpm rebuild better-sqlite3

# --- Production ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_URL=/app/data/data.db

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 grimoire && \
    mkdir -p /app/data && chown grimoire:nodejs /app/data

COPY --from=prod-deps --chown=grimoire:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=grimoire:nodejs /app/dist ./dist
# Drizzle migrations applied on startup (see src/server.ts)
COPY --from=builder --chown=grimoire:nodejs /app/drizzle ./drizzle
# Required at runtime for "type": "module" — without it Node treats
# dist/server/server.js as CommonJS and the import fails.
COPY --chown=grimoire:nodejs package.json ./

USER grimoire
EXPOSE 3000

# Invoking srvx directly keeps node as PID 1, so signals and graceful shutdown
# work. `-s ../client` is resolved relative to the server bundle.
CMD ["node_modules/.bin/srvx", "--prod", "-s", "../client", "dist/server/server.js"]
