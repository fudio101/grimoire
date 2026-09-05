FROM node:26-alpine AS base
# Node 25+ no longer bundles corepack, so install it before enabling.
# corepack honours the `packageManager` pin in package.json.
RUN npm i -g corepack@latest && corepack enable
WORKDIR /app

# --- Build dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build
# The build must never have opened the database — next build evaluating
# every page module during "Collecting page data" is exactly the failure
# mode hazard 1's lazy SQLite connection (and force-dynamic) exist to avoid.
RUN test ! -f data.db
# outputFileTracingIncludes (next.config.ts) has to reach through a
# *computed* require path in better-sqlite3's binding.js that file tracing
# can't follow on its own — a build that silently produced a standalone
# bundle missing the native addon looks identical to a working one until
# runtime, so this is a control, not decoration.
RUN find .next/standalone -name 'linuxmusl-*.node' -print -quit | grep -q . \
    || (echo "better-sqlite3 prebuild missing from standalone output" && exit 1)

# --- Production ---
# No native-rebuild stage: better-sqlite3 ships prebuilt binaries resolved
# via fs.existsSync (see next.config.ts's comment) and has no install/
# postinstall script at all, so there's nothing to rebuild. .next/standalone
# already carries its own minimal traced node_modules — the prod-only
# install + `pnpm rebuild better-sqlite3` stage the pre-Start-migration
# Dockerfile needed here is gone, not preserved.
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=/app/data/data.db
# getCurrentMonth() (src/lib/format.ts) is local-time; without this the
# container computes "current month" in UTC while the Vietnamese browsers
# using it are UTC+7, diverging between 00:00-07:00 ICT on the 1st of every
# month. The ENV var alone is not enough — Alpine ships no tzdata by
# default, so TZ silently has no effect without it (found by actually
# checking `date` inside a running container, not just setting the var and
# assuming it worked).
ENV TZ=Asia/Ho_Chi_Minh
RUN apk add --no-cache tzdata

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 grimoire && \
    mkdir -p /app/data && chown grimoire:nodejs /app/data

# Standalone ships its own server.js and package.json ("type": "module"
# carried over from the root one) — no explicit COPY package.json needed.
COPY --from=builder --chown=grimoire:nodejs /app/.next/standalone ./
COPY --from=builder --chown=grimoire:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=grimoire:nodejs /app/public ./public
# Drizzle migrations applied on startup (see src/instrumentation.node.ts).
# migrate.ts resolves path.join(process.cwd(), "drizzle"), so this has to
# land at /app, matching the WORKDIR every other stage already uses.
COPY --from=builder --chown=grimoire:nodejs /app/drizzle ./drizzle

USER grimoire
EXPOSE 3000

# `node -e` rather than wget: node:26-alpine does ship BusyBox wget (an earlier
# version of this comment claimed otherwise — it was wrong), but BusyBox wget
# reports only transport failures. It cannot read `{ ok: false }` out of a 503
# body, which is the case this endpoint exists to signal. Node is already PID 1
# here, so using it costs nothing.
#
# ⚠️ A `healthcheck:` block in the compose file OVERRIDES this one. If the
# deployed stack declares its own, this never runs — see docs/adr/0001.
#
# start-period is 30s, not the interval, because runMigrations() in
# src/instrumentation.node.ts runs on first request against the real volume and
# can include the auto-baseline pass over a pre-existing database. Failures
# during the start period do not count toward `retries`, so being generous here
# is free, while being too tight restarts the container mid-migration.
#
# 127.0.0.1, not localhost: the server binds HOSTNAME=0.0.0.0, and resolving
# `localhost` inside the container can hand back ::1 first, where nothing is
# listening — a healthcheck that fails for a reason unrelated to health.
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>r.ok?r.json():Promise.reject()).then(b=>process.exit(b.ok?0:1)).catch(()=>process.exit(1))"

# node as PID 1 (no srvx) keeps signal handling direct — instrumentation.node.ts's
# own SIGTERM/SIGINT handlers close the database and exit cleanly.
CMD ["node", "server.js"]
