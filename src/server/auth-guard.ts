import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifyToken } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

/**
 * Unchanged from the TanStack Start version, so existing `session` cookies
 * stay valid across the migration and nobody is signed out.
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
} as const;

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * UX-guard read — used by `app/dashboard/layout.tsx` to keep signed-out
 * visitors off the screen, the same role `beforeLoad` played under TanStack
 * Router. Not the security boundary by itself; see `requireAuth` for that.
 */
export async function readSession(): Promise<{ sub: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? await verifyToken(token) : null;
}

/**
 * The security boundary for every private Server Action and Route Handler.
 *
 * A Server Action reference is a stable ID that can be POSTed to any route
 * regardless of which page rendered it, and a Route Handler is a plain
 * fetchable URL — neither is covered by a proxy/middleware matcher the way a
 * page is. Every Server Action and Route Handler that reads or writes
 * private data must call this (or `requireAuthForAction`, its Server-Action
 * flavoured wrapper below) directly.
 */
export async function requireAuth(): Promise<{ sub: string }> {
  const admin = await readSession();
  if (!admin) throw new UnauthorizedError();
  return admin;
}

/**
 * `requireAuth`, reshaped for Server Actions: converts an auth failure into
 * the same `ActionState` shape every mutation already returns on any other
 * failure, rather than throwing across the action boundary. Next redacts an
 * error thrown from inside a Server Action before it reaches the client, so
 * a caller could not reliably tell "signed out" apart from any other server
 * error that way — every calling form already knows how to render
 * `result.error`, so this reuses that path instead of adding a second one.
 */
export async function requireAuthForAction(): Promise<ActionState | null> {
  try {
    await requireAuth();
    return null;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      };
    }
    throw err;
  }
}
