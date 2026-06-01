# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grimoire is a self-hosted expense tracker with Vietnamese UI and VND currency. Single-admin JWT auth, SQLite storage, mobile-first responsive design.

## Commands

| Command | Purpose |
|---|---|
| `pnpm run dev` | Start dev server |
| `pnpm run build` | Production build |
| `pnpm run lint` | ESLint check |
| `pnpm run lint:fix` | ESLint auto-fix |
| `pnpm run format` | Prettier format |
| `pnpm run format:check` | Prettier check (used in CI) |
| `pnpm run db:push` | Push Drizzle schema to SQLite (local iteration only) |
| `pnpm run db:generate` | Generate a versioned migration from schema changes |
| `pnpm run db:studio` | Open Drizzle Studio for DB inspection |

There is no test framework configured. CI (`.github/workflows/ci.yml`) runs `pnpm run lint`, type-check (`pnpm exec tsc --noEmit`), and `pnpm run build` on a self-hosted Linux runner. Fork PRs are blocked from CI.

## Setup

```bash
pnpm install
cp .env.example .env.local  # set ADMIN_USERNAME, ADMIN_PASSWORD, AUTH_SECRET (32+ chars), DATABASE_URL
pnpm run dev  # migrations apply automatically on startup (src/instrumentation.ts)
```

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Base UI (shadcn) · Drizzle ORM · SQLite · jose (JWT)

### Layers

- **Pages** (`src/app/`) — Next.js App Router. Server-rendered pages fetch data at page level. Protected routes under `/dashboard`, public shared views at `/p/[shareToken]`.
- **Server Actions** (`src/app/actions/`) — All mutations (auth, transactions, categories) use `"use server"` actions. Return `{ success, error? }` (`ActionState`). Call `revalidatePath()` after writes.
- **Queries** (`src/lib/db/queries.ts`) — Read-only data access functions. Separated from mutations in actions.
- **Schema** (`src/lib/db/schema.ts`) — Drizzle table definitions: `categories` and `transactions`. Uses UUIDv7 for IDs, nanoid for share tokens.
- **Validation** (`src/lib/schemas.ts`) — Zod schemas for transactions, categories, and login. Used with react-hook-form via zodResolver.
- **Features** (`src/features/`) — Feature-scoped client components (transaction form/table/filters, category form/list).
- **Components** (`src/components/`) — Reusable UI primitives in `ui/` (shadcn/Base UI). App-level shared components at root: `ResponsiveModal` (dialog on desktop, drawer on mobile), `CurrencyInput` (VND formatting), `SubmitButton` (loading state via `useFormStatus`), `ConfirmDialog`.

### Auth

Single-admin JWT (HS256, 7-day expiry, `sub: "admin"`) stored in httpOnly `session` cookie via `src/lib/auth.ts` (jose). Route protection lives in `src/proxy.ts` — this is Next.js 16's renamed middleware file (the old `middleware.ts` convention); it exports a `proxy` function with `matcher: ["/dashboard/:path*"]` and redirects unauthenticated requests to `/login`. Credentials from env vars `ADMIN_USERNAME`/`ADMIN_PASSWORD`. Secret from `AUTH_SECRET` (must be 32+ chars).

### Database

SQLite via better-sqlite3 with Drizzle ORM (`src/lib/db/index.ts`). WAL mode + 5s busy timeout. `DATABASE_URL` defaults to `./data.db` if unset.

**Migrations:** Versioned SQL migrations in `drizzle/` are the source of truth. After editing `schema.ts`, run `pnpm run db:generate` to produce a new migration and commit it. They are applied automatically on server startup by `src/lib/db/migrate.ts`, wired via `src/instrumentation.ts` (Next's `register()` hook, Node runtime only). `src/lib/db/migrate.ts` auto-baselines pre-existing databases (created by the old `db:push` flow with no `__drizzle_migrations` ledger): it stamps them as applied up to the migration matching their current columns, so existing volumes upgrade in place without `table already exists` / `duplicate column` errors. `pnpm run db:push` remains for quick local iteration only. The Docker image copies `drizzle/` into the runner; there is no `template.db` seeding.

**Date handling:** `transactions.date` is an ISO string `YYYY-MM-DDTHH:mm`. Month filtering compares string prefixes — `fromMonth` uses `>= "${month}-01"`, `toMonth` uses `< nextMonthStart()` (see `nextMonthStart` in `queries.ts`). No `Date` math in SQL; lexicographic string ordering on ISO dates is the mechanism.

## Key Conventions

- **Path alias:** `@/*` maps to `src/*`
- **Vietnamese UI:** All user-facing text is in Vietnamese. Currency formatted as VND with `formatVND()` from `src/lib/format.ts`.
- **Responsive pattern:** `useMediaQuery` hook (`src/hooks/use-media-query.ts`) with `ResponsiveModal` — renders Dialog on desktop (md+), Drawer on mobile.
- **Form pattern:** react-hook-form + Zod + Controller for custom inputs. Server actions invoked from `onSubmit`, not `action` prop.
- **Standalone output:** `next.config.ts` sets `output: "standalone"` for Docker deployment.
- **Release process:** GitHub Flow. Release-Please creates version bump PRs. Docker images published to GHCR on tagged releases.
