# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grimoire is a self-hosted expense tracker with Vietnamese UI and VND currency. Single-admin JWT auth, SQLite storage, mobile-first responsive design.

## Library priority

When something new is needed, pick in this order — whichever is named first wins:

1. **TanStack first** — Query, Table, Form, Virtual, Store, Pacer.
2. **shadcn first** — if TanStack has no answer, take the component from shadcn (the `base-nova` registry, built on Base UI).
3. **Tailwind first** — if neither does, build it with Tailwind utilities rather than pulling in another CSS or UI library.

Only reach outside those three when none of them has a solution, and record why in the PR description.

Accepted exceptions: **recharts** (what shadcn's chart is built on — TanStack has no charting library), **vaul** (what shadcn's drawer is built on — Base UI has no drawer), plus `jose`, `drizzle-orm`, `better-sqlite3`, `zod` and `server-only`.

## Commands

| Command | Purpose |
|---|---|
| `pnpm run dev` | Start dev server |
| `pnpm run build` | Production build → `.next/standalone` |
| `pnpm run start` | Serve the production build |
| `pnpm run lint` | ESLint check |
| `pnpm run lint:fix` | ESLint auto-fix |
| `pnpm run format` | Prettier format |
| `pnpm run format:check` | Prettier check (runs in CI) |
| `pnpm run db:push` | Push Drizzle schema to SQLite (local iteration only) |
| `pnpm run db:generate` | Generate a versioned migration from schema changes |
| `pnpm run db:studio` | Open Drizzle Studio for DB inspection |

There is no test framework configured. CI (`.github/workflows/ci.yml`) runs lint, `format:check`, type-check, and build on a self-hosted Linux runner. Fork PRs are blocked from CI. The runner is a small, swap-less box, so `ci.yml` sets `MALLOC_ARENA_MAX`/`NODE_OPTIONS` at the job level as a standing memory mitigation — don't remove them without knowing why (a real CI OOM incident is what put them there).

Those checks prove the code compiles and is formatted — nothing more. **Behaviour has to be verified by running it**, and a check that something is now rejected means little on its own: pair it with a control that must still pass, or a broken build looks identical to a working guard. Migrations especially need exercising against a copy of a real `data.db`, not just a fresh one — the fresh path is the one that cannot break.

Node version is pinned to 26 by `.nvmrc`, and CI plus the Docker image match it.

**TypeScript runs side-by-side (TS 7 + TS 6).** `tsc` is TypeScript 7 (the Go compiler), installed as `"@typescript/native": "npm:typescript@^7"`; the `typescript` specifier is aliased to `@typescript/typescript6`, which is what still ships a JS compiler API. typescript-eslint cannot use TS 7 until TS ships a new API (7.1) — [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) is open and locked — so the lint layer resolves `typescript` and gets TS 6. Consequences: `pnpm run typecheck` is TS 7, `pnpm run lint` and Next's own type step are TS 6, and `experimental.useTypeScriptCli: false` in `next.config.ts` is load-bearing (Next 16.3 otherwise looks for `typescript/bin/tsc`, which the TS 6 alias package does not ship — it has `bin/tsc6`). Collapse this back to a single `typescript` dependency once typescript-eslint supports TS 7.

## Setup

```bash
pnpm install
cp .env.example .env.local  # set ADMIN_USERNAME, ADMIN_PASSWORD, AUTH_SECRET (32+ chars), DATABASE_URL
pnpm run dev  # migrations apply automatically on startup (src/instrumentation.node.ts)
```

## Architecture

**Stack:** Next.js 16 (App Router) · TanStack Query · TanStack Table · TanStack Form · TanStack Virtual · React 19 · TypeScript · Tailwind CSS 4 · Base UI (shadcn) · Drizzle ORM · SQLite · jose (JWT)

### Layers

- **App Router** (`src/app/`) — Root layout at `src/app/layout.tsx` reads the theme cookie once via `cookies()` and forces `export const dynamic = "force-dynamic"` (load-bearing — see below). Protected pages live under `src/app/dashboard/**`, guarded by `readSession()` in `dashboard/layout.tsx`; `src/app/login/` and the public shared report at `src/app/p/[code]/` (its own segment-scoped `not-found.tsx`/`error.tsx`, deliberately **no** `loading.tsx` — see below). Every `page.tsx`/`layout.tsx` does exactly three things: parse `searchParams`/read `cookies()`, prefetch into a per-request `QueryClient`, and render exactly one `"use client"` view wrapped in `<HydrationBoundary>` — it never imports `components/ui/*` or a feature component directly.
- **Server layer** (`src/server/`) — Mutations live in `*.actions.ts` (`"use server"`, 13 total), returning `{ success, error? }` (`ActionState`) for business-rule failures. Reads split two ways: Route Handlers (`src/app/api/*/route.ts`) back client-side `fetchJson` calls from `src/lib/api.ts`; plain functions in `*.queries.ts`/`src/lib/db/queries.ts` are what RSC pages call **directly** during prefetch — never their own Route Handler, which would be a self-fetch from the server back to itself. A third tier, `*.server.ts` (`categories.server.ts`, `share-links.server.ts`, `transactions.server.ts`), holds shared Drizzle predicates called from the actions/queries above it — despite the name, these are live business logic, not a TanStack leftover.
- **Query options** (`src/lib/query-options.ts`) — `queryOptions()` factories. The query keys double as the invalidation map. Their `queryFn`s call `fetchJson` against `app/api/*` — client-side only; RSC prefetch bypasses this entirely (see above).
- **Queries** (`src/lib/db/queries.ts`) — Read-only Drizzle access. Server functions wrap these; the module is server-only.
- **Schema** (`src/lib/db/schema.ts`) — Drizzle table definitions: `categories` (self-referential `parentId` for nested hierarchy), `transactions`, `shareLinks`, and the `shareLinkCategories` junction. Uses UUIDv7 for IDs, nanoid(12) for auto-generated share-link codes.
- **Validation** (`src/lib/schemas.ts`) — Zod schemas, shared between TanStack Form and both Server Actions' and Route Handlers' own re-validation of input.
- **Features** (`src/features/`) — Feature-scoped components: `transactions/` (form, `columns.tsx` + `transaction-data-table.tsx` on TanStack Table/Virtual, filters, `expense-chart.tsx` on Recharts), `categories/`, `share-links/`.
- **Components** (`src/components/`) — Reusable UI primitives in `ui/` (shadcn/Base UI). App-level shared components at root: `ResponsiveModal` (dialog on desktop, drawer on mobile), `CurrencyInput` (VND formatting), `SubmitButton`, `ConfirmDialog`, `PendingIndicator`.

### Data flow

A server `page.tsx` calls the plain query function directly and seeds the cache via `queryClient.setQueryData(xQueryOptions(...).queryKey, await getX(...))` — never `ensureQueryData`/`prefetchQuery`, which would trigger the self-fetch described above. The paired client view then reads the same query back with `useSuspenseQuery`, so SSR renders real data and hydration reuses it.

**Filter/month changes go through `router.push(url, { scroll: false })` wrapped in `useTransition`**, since the App Router has no shallow-routing primitive that also re-renders the server tree. `useDelayedPending` (`src/hooks/use-delayed-pending.ts`) replicates the old `defaultPendingMs: 200`. `src/lib/search-params.ts`'s `parseOverviewSearch`/`parseTransactionSearch`/`parsePublicReportSearch` (plus `pickSearchParam`, which narrows Next's `string | string[] | undefined` searchParams to match `URLSearchParams.get()`'s semantics) are the single source of truth both the server-side `searchParams` parse and the client's derived state import — this is what keeps them deriving identical query keys from the same URL.

Mutations invalidate rather than revalidate a path. The bare prefix covers every filter combination:

| Mutation | Invalidates |
|---|---|
| transactions | `["transactions"]`, `["overview"]`, `["recentCategories"]` |
| categories | `["categories"]`, `["transactions"]`, `["overview"]`, `["recentCategories"]` |
| share links | `["shareLinks"]` |

Categories reach into `["transactions"]` because category names render inside the transaction table, and into `["overview"]`/`["recentCategories"]` because both roll up by category. Sign-out has no session query to invalidate — it calls `queryClient.removeQueries()` (evict everything, since there's nothing narrower left to target), then `router.replace("/login")`, then `router.refresh()` to clear the App Router's own cached RSC payload so Back doesn't resurrect the dashboard.

### Auth

Single-admin JWT (HS256, 7-day expiry, `sub: "admin"`) in an httpOnly `session` cookie via `src/lib/auth.ts` (jose). Credentials from `ADMIN_USERNAME`/`ADMIN_PASSWORD`, secret from `AUTH_SECRET` (32+ chars).

Two distinct layers, and the distinction matters:

- **`readSession()` at the top of `src/app/dashboard/layout.tsx`** is a UX guard. It keeps signed-out visitors off the screen and, like the App Router's own re-fetch of a layout's RSC payload on client-side navigation, runs on every navigation too.
- **`requireAuth()`/`requireAuthForAction()` in `src/server/auth-guard.ts`** is the security boundary. A Server Action reference is a stable ID postable to *any* route regardless of which page rendered it — not just the calling page's own URL — so a path-based guard genuinely cannot be the real boundary. **Every private Server Action and Route Handler must carry its own check, no exceptions.** The only public surfaces are `login` (Server Action) and the `/api/public-report` Route Handler (deliberately unauthenticated, backing `getPublicReport` for `/p/[code]` readers who never sign in).

`AUTH_SECRET` must be at least 32 characters; `assertAuthSecret()` runs from `src/instrumentation.node.ts` so a weak secret fails at startup rather than at the first login.

CSRF is layered per transport: Server Actions get Next's built-in Origin/Host check for free. Route Handler reads get an explicit one via `guardApiRequest()` in `src/server/http-auth.ts`, on top of the auth check.

### Database

SQLite via better-sqlite3 with Drizzle ORM (`src/lib/db/index.ts`). WAL mode + 5s busy timeout. `DATABASE_URL` defaults to `./data.db` if unset. The connection is opened lazily (`getSqlite()`/`getDrizzle()` behind a `Proxy`, so importing the module is free) and cached on `globalThis` as the standard `next dev` HMR-safe singleton idiom.

**Migrations:** Versioned SQL migrations in `drizzle/` are the source of truth. After editing `schema.ts`, run `pnpm run db:generate` and commit the migration. They apply automatically on server startup via `src/lib/db/migrate.ts`, called from `src/instrumentation.node.ts`, itself invoked via `src/instrumentation.ts`'s `register()` hook (Next's own instrumentation convention) — explicitly skipped during `NEXT_PHASE=phase-production-build`, so `next build` never opens the database (enforced directly by CI's and the Docker build's `test ! -f data.db` steps). `migrate.ts` auto-baselines pre-existing databases (created by the old `db:push` flow with no `__drizzle_migrations` ledger): it stamps them as applied up to the migration matching their current columns, so existing volumes upgrade in place without `table already exists` / `duplicate column` errors. **Every new migration needs a matching `SCHEMA_PROBES` entry** or legacy databases replay incorrectly. `pnpm run db:push` remains for quick local iteration only.

**Date handling:** `transactions.date` is an ISO string `YYYY-MM-DDTHH:mm`. Month filtering compares string prefixes — `fromMonth` uses `>= "${month}-01"`, `toMonth` uses `< nextMonthStart()` (see `nextMonthStart` in `queries.ts`). No `Date` math in SQL; lexicographic string ordering on ISO dates is the mechanism.

## Key Conventions

- **Path alias:** `@/*` maps to `src/*`
- **Vietnamese UI:** All user-facing text is in Vietnamese. Currency formatted as VND with `formatVND()` from `src/lib/format.ts`.
- **Responsive pattern:** `useMediaQuery` hook (`src/hooks/use-media-query.ts`) with `ResponsiveModal` — Dialog on desktop (md+), Drawer on mobile. Its `getServerSnapshot: () => false` means the server always renders the Drawer branch and desktop clients swap after hydration; that is a legitimate transition, not a mismatch.
- **Form pattern:** TanStack Form with `form.Field` render-props and the shared Zod schema on `validators.onSubmit`. Form values must be typed as the schema's **input** (`z.input<>`, e.g. `CategoryFormValues`), not its output — TanStack Form matches a Standard Schema invariantly and the two differ at every optional field. Server-side failures go to local state, not the form error map.
- **Table:** TanStack Table **v9**, where nothing is bundled by default — `src/features/transactions/table-features.ts` registers the features the table may use (`rowSortingFeature`, the sorted row model, and the `sortFns` names `getAutoSortFn()` can ask for), and an API that is missing is a feature that was not registered rather than one v9 removed. `ColumnDef` is generic over that feature set, so `columns.tsx` types against `TransactionTableFeatures`. The columns serve the dashboard only; the public report renders its own card list. Rows are virtualized and absolutely positioned, so column widths are declared in `transaction-data-table.tsx` rather than derived from content.
- **`export const dynamic = "force-dynamic"` on the root layout is load-bearing.** `next build`'s static-generation attempt can execute a page's own data-fetching code *concurrently* with an ancestor layout's `cookies()` call, not strictly after it, so `cookies()` alone doesn't reliably stop a build from opening `data.db`. `force-dynamic` is checked per route segment before any component body runs and cascades to every nested layout/page — don't "simplify" it away.
- **`loading.tsx` + `notFound()`/`redirect()` in the same segment is a real trap.** A `loading.tsx` makes Next start streaming (committing to a 200 status) before a deeper conditional `notFound()`/`redirect()` call can resolve, so the right UI can render with the wrong HTTP status. `/p/[code]` has no `loading.tsx` for this reason.
- **Build output:** `.next/standalone` (self-contained `server.js` + a minimal traced `node_modules`) + `.next/static` + `public/` + `drizzle/`. Next's output-file-tracing can miss a deep/computed `require()` path under pnpm's virtual store — hit twice so far (`better-sqlite3`'s prebuilds, `@swc/helpers`), both fixed via an explicit `outputFileTracingIncludes` glob in `next.config.ts`; worth knowing the pattern before a third instance. `TZ=Asia/Ho_Chi_Minh` needs `apk add --no-cache tzdata` on the `node:26-alpine` runner stage — the env var alone silently does nothing.
- **Release process:** GitHub Flow. Release-Please creates version bump PRs. Docker images published to GHCR on tagged releases. The runtime image is ~347MB (down from 597MB before the Next.js migration).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
