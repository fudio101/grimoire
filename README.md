[![CI](https://github.com/fugo101/grimoire/actions/workflows/ci.yml/badge.svg)](https://github.com/fugo101/grimoire/actions/workflows/ci.yml)

# Grimoire

A lightweight, self-hosted expense tracker. Vietnamese UI, VNĐ currency, SQLite storage.

## Features

- Single-user admin with JWT session
- Transaction logging — amount, note, datetime, category
- Category management with public sharing via secure URLs
- Month range filtering for transactions
- Mobile-first responsive design with drawer/dialog components
- Client-side validation with react-hook-form + Zod
- Vietnamese currency input formatting

## Tech Stack

Next.js 16 · React 19 · Tailwind CSS 4 · Base UI · SQLite · Drizzle ORM · jose · ESLint · Prettier

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

## Docker

Pre-built images are published to GHCR on each tagged release.

```bash
# Using pre-built image
docker run -d -p 3000:3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=changeme \
  -e AUTH_SECRET=your-secret-key-at-least-32-chars \
  -v grimoire-data:/app/data \
  ghcr.io/fudio101/grimoire:latest

# Or build locally
docker build -t grimoire .
```

SQLite data is persisted at `/app/data/data.db` via volume mount.

### Upgrading & migrating the database

Schema migrations run **automatically on startup** — no manual steps. Versioned SQL migrations live in [`drizzle/`](drizzle/) and are applied by `src/lib/db/migrate.ts` (wired through `src/instrumentation.ts`) every time the server boots. To upgrade:

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

**To create a release:**

1. Go to **Actions** → **Release PR** → **Run workflow** → choose `patch` / `minor` / `major`
2. Workflow automatically:
   - Creates a release branch with version bump
   - Opens a PR to `main` (labeled `release`)
   - Auto-approves and sets PR to auto-merge (squash)
3. When PR is merged, the publish workflow automatically:
   - Creates git tag
   - Builds and pushes Docker image to GHCR
   - Creates GitHub Release with auto-generated notes from merged PRs since last release

The `main` branch history stays clean with proper squash-merged PRs.

## Project Structure

```
src/
├── app/
│   ├── actions/           # Server actions (auth, categories, transactions)
│   ├── dashboard/         # Admin pages
│   │   └── categories/    # Category management page
│   ├── login/             # Authentication
│   └── p/[shareToken]/    # Public shared category view
├── features/
│   ├── transactions/      # Transaction form, table, filters, add button
│   │   └── month-range-filter.tsx
│   └── categories/        # Category form, list, copy button
├── components/
│   ├── ui/                # Base UI components (dialog, select, button, etc.)
│   ├── responsive-modal.tsx  # Desktop dialog / mobile drawer
│   ├── confirm-dialog.tsx    # Confirmation dialogs
│   ├── submit-button.tsx     # Loading state button
│   └── currency-input.tsx    # VND formatted input
├── hooks/                 # Custom React hooks
└── lib/
    ├── db/                # Schema & queries (Drizzle ORM)
    ├── schemas.ts         # Zod validation schemas
    ├── types.ts           # Shared TypeScript types
    ├── auth.ts            # JWT session utilities
    └── format.ts          # Currency & datetime formatters
```
