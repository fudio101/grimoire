/**
 * Split out of auth.functions.ts ahead of the Next.js migration: a `"use
 * server"` file may only export async functions, so this plain value export
 * would be a hard compile error there.
 *
 * `requireAdmin` and `readSession` stay in auth.functions.ts for now, rather
 * than moving here too: TanStack Start's import-protection plugin only
 * compiles a `createMiddleware(...).server(fn)` body away from the client
 * bundle when it is defined in a file that also defines a `createServerFn`
 * — split into a file with neither, its `getCookie` import (via
 * `readSession`) becomes a live client-bundle violation instead of a
 * stripped one. Moving them is deferred to the PR that retires the Start
 * toolchain, where this distinction no longer applies.
 *
 * Unchanged from the Next.js version, so existing `session` cookies stay
 * valid across the migration and nobody is signed out.
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
} as const;
