import { createToken, SESSION_COOKIE_NAME } from "@/lib/auth";

/**
 * A stand-in for the Next.js request context that Server Actions read their
 * session from.
 *
 * Only `cookies()` is faked. The cookie carries a genuine token minted by
 * `createToken`, so `verifyToken` and `requireAuthForAction` run for real and a
 * signed-out case is a real signed-out request rather than a stubbed boolean.
 *
 * Use it from a test file as:
 *
 * ```ts
 * vi.mock("next/headers", async () => {
 *   const { cookieJar } = await import("@/test/session");
 *   return { cookies: async () => cookieJar() };
 * });
 * ```
 *
 * The factory has to be written inline like that — `vi.mock` is hoisted above
 * the imports, so it cannot close over one.
 */
const TEST_AUTH_SECRET = "test-secret-for-vitest-0123456789abcdef";

const state: { token: string | null } = { token: null };

export function cookieJar() {
  return {
    get: (name: string) =>
      name === SESSION_COOKIE_NAME && state.token
        ? { name, value: state.token }
        : undefined,
  };
}

/**
 * Set per test rather than once at module scope: `auth.test.ts` deletes
 * AUTH_SECRET in its own hooks, and these files can share a worker with it.
 */
export async function signIn(): Promise<void> {
  process.env.AUTH_SECRET = TEST_AUTH_SECRET;
  state.token = await createToken();
}

export function signOut(): void {
  state.token = null;
}
