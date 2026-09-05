[![CI](https://github.com/fugo101/grimoire/actions/workflows/ci.yml/badge.svg)](https://github.com/fugo101/grimoire/actions/workflows/ci.yml)

# Grimoire

A lightweight, self-hosted expense tracker. Vietnamese UI, VNĐ currency, SQLite storage.

## Features

- Single-user admin with JWT session
- Transaction logging — amount, note, datetime, and two independent dimensions: a **Purpose** (what the money was for) and a **Funding Source** (which pot it came from)
- A Purpose's total across every Funding Source, with the funding split beneath it
- Filtering by either dimension independently, or by both
- Purpose and Funding Source management, with public sharing via secure URLs
- Month range filtering for transactions
- Mobile-first responsive design with drawer/dialog components
- Sortable, virtualized transaction table
- Client-side validation with TanStack Form + Zod
- Vietnamese currency input formatting

## Tech Stack

Next.js 16 (App Router) · TanStack Query · TanStack Table · TanStack Form · TanStack Virtual · React 19 · Tailwind CSS 4 · Base UI · SQLite · Drizzle ORM · jose · ESLint · Prettier

## Quick Start

### Docker Compose

```bash
cp .env.example .env   # edit credentials
docker compose up -d
```

### Local Development

```bash
pnpm install
cp .env.example .env.local   # edit credentials
pnpm run dev                 # migrations apply automatically on startup
```

## Environment Variables

| Variable         | Description                 | Default     |
| ---------------- | --------------------------- | ----------- |
| `ADMIN_USERNAME` | Login username              | `admin`     |
| `ADMIN_PASSWORD` | Login password              | `changeme`  |
| `AUTH_SECRET`    | JWT signing key (32+ chars) | —           |
| `DATABASE_URL`   | SQLite database path        | `./data.db` |

## Scripts

| Command                | Description           |
| ---------------------- | --------------------- |
| `pnpm run dev`          | Dev server            |
| `pnpm run build`        | Production build      |
| `pnpm run start`        | Production server     |
| `pnpm run lint`         | ESLint                |
| `pnpm run lint:fix`     | ESLint with auto-fix  |
| `pnpm run format`       | Prettier format       |
| `pnpm run format:check` | Prettier check (CI)   |
| `pnpm run db:generate`  | Generate a migration from schema changes |
| `pnpm run db:push`      | Push schema directly (local iteration only) |
| `pnpm run db:studio`    | Open Drizzle Studio   |

## Deployment & ingress

Requests reach the app through a **Cloudflare Tunnel**, not a published port:

```
browser → Cloudflare edge → cloudflared → Traefik → grimoire:3000
```

`cloudflared` runs as a container on the same `traefik_network` Docker network and dials out, so **no port is published on the host** — there is no direct route to the origin. Two things follow, and both matter when changing anything security-related:

- **`CF-Connecting-IP` is the client IP to trust.** Cloudflare sets it as a single value and it survives the hops intact. This holds *only* while the origin stays unreachable directly; publishing a host port would let a caller set that header themselves.
- **Verify response headers against the real hostname.** Cloudflare can alter or minify what it forwards, so `curl -I` against localhost shows what the app emitted, not what a visitor gets.

The full record, including what is verified and what is still inferred, is in [`docs/adr/0001-cloudflare-tunnel-ingress.md`](docs/adr/0001-cloudflare-tunnel-ingress.md).

Note that `docker-compose.yml` in this repo is a **reference example**: production runs from a Dockge-managed stack on the VPS. Beware that a compose file can also *override* what the image declares — a `healthcheck:` block there supersedes the image's own `HEALTHCHECK`, for instance.

The public hostname is `grimoire.fudio101.com`.

## Security headers

Set in two places, on purpose:

- **`next.config.ts`** — the static ones: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **`src/proxy.ts`** — the `Content-Security-Policy`, which carries a fresh per-request nonce and so cannot be static. `script-src` is strict (nonce + `'strict-dynamic'`, no `'unsafe-inline'`); `style-src` keeps `'unsafe-inline'` because CSP has no nonce mechanism for `style="..."` attributes, which the virtualized table and every popover rely on.

`src/proxy.ts` is **not** an auth boundary and must not become one — that stays in `src/server/auth-guard.ts`.

## Docker

Pre-built images are published to GHCR on each tagged release. The runtime image is ~347MB.

The image carries its own `HEALTHCHECK`, so `docker ps` reports `(healthy)` / `(unhealthy)` with no extra
configuration. It polls `/api/health` on the container's own port, which runs a single `SELECT 1` against
SQLite — enough to catch a process that still accepts connections after losing its database (a detached
volume, a connection closed by a botched shutdown), which a plain port check would report as healthy.
`start-period` is 30s so the migrations that run on first request can finish before a failing check counts.

```bash
# Using pre-built image
docker run -d -p 3000:3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=changeme \
  -e AUTH_SECRET=your-secret-key-at-least-32-chars \
  -v grimoire-data:/app/data \
  ghcr.io/fugo101/grimoire:latest

# Or build locally
docker build -t grimoire .
```

SQLite data is persisted at `/app/data/data.db` via volume mount.

### Upgrading & migrating the database

Schema migrations run **automatically on startup** — no manual steps. Versioned SQL migrations live in [`drizzle/`](drizzle/) and are applied by `src/lib/db/migrate.ts` (called from `src/instrumentation.node.ts`, itself invoked via `src/instrumentation.ts`) every time the server boots. To upgrade:

```bash
docker compose pull
docker compose up -d
```

How it handles each database state on boot:

| Database state | Behavior |
|---|---|
| Fresh volume (empty) | All migrations run, building the full schema from scratch. |
| Existing volume from an older image | Auto-baselined, then only the missing migrations run. Your data is preserved. |
| Already up to date | Nothing runs (idempotent). |

The first boot after introducing migrations auto-baselines pre-existing databases (created by the old `db:push` flow), so you can upgrade in place without `no such column`, `table already exists`, or `duplicate column` errors.

> ⚠️ Still worth backing up the SQLite volume before a major upgrade — migrations add and alter, but a backup is cheap insurance.

#### Changing the schema (for contributors)

Migrations are committed to the repo. After editing `src/lib/db/schema.ts`, generate a new migration and commit it alongside the schema change:

```bash
pnpm run db:generate   # writes a new drizzle/NNNN_*.sql + meta snapshot
```

Use `pnpm run db:push` only for quick local iteration; the committed migrations in `drizzle/` are the source of truth that ships in the image.

## Releasing

This project uses GitHub Flow. Development happens on feature branches, merged to `main` via PRs.

Releases are automated by [Release Please](https://github.com/googleapis/release-please), triggered on every push to `main`:

1. Release Please watches merged PRs and keeps a release PR up to date with the next version bump and changelog, inferred from Conventional Commits.
2. Merging that release PR creates the git tag and GitHub Release.
3. The tagged release triggers the Docker publish workflow, which builds and pushes the image to GHCR.

No manual workflow dispatch is needed — just merge the release PR when you're ready to ship.

## Project Structure

```
src/
├── app/
│   ├── api/                       # Route Handlers (client-side reads)
│   ├── dashboard/                 # readSession()-guarded pages
│   │   ├── manage/{purposes,funding-sources,links}/
│   │   └── transactions/
│   ├── login/
│   ├── p/[code]/                  # Public shared report (own not-found/error)
│   ├── layout.tsx                 # Root layout, force-dynamic, theme cookie
│   └── providers.tsx, theme-context.tsx, error.tsx, not-found.tsx, global-error.tsx
├── server/
│   ├── *.actions.ts               # Server Actions (mutations)
│   ├── *.queries.ts               # Plain read functions (overview, public-report)
│   └── auth-guard.ts, http-auth.ts
├── features/
│   └── transactions/, dimensions/, share-links/, overview/, public-report/
├── components/
│   ├── ui/                        # Base UI components (dialog, select, button, etc.)
│   ├── responsive-modal.tsx       # Desktop dialog / mobile drawer
│   ├── nav-link.tsx               # Active-link matching via usePathname()
│   ├── submit-button.tsx          # Loading state button
│   └── currency-input.tsx         # VND formatted input
├── hooks/                         # Custom React hooks
├── lib/
│   ├── db/                        # Schema, queries & migrations (Drizzle ORM)
│   ├── schemas.ts                 # Zod validation schemas
│   ├── search-params.ts           # Shared searchParams parsing (server + client)
│   ├── query-options.ts, query-client.ts, api.ts
│   ├── types.ts                   # Shared TypeScript types
│   ├── auth.ts                    # JWT session utilities
│   └── format.ts                  # Currency & datetime formatters
└── instrumentation.ts, instrumentation.node.ts   # Startup migrations, AUTH_SECRET check
```
