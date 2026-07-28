import { createMiddleware, createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import {
  SESSION_COOKIE_NAME,
  createToken,
  validateCredentials,
  verifyToken,
} from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/types";

// Unchanged from the Next.js version, so existing `session` cookies stay valid
// across the migration and nobody is signed out.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
} as const;

async function readSession() {
  const token = getCookie(SESSION_COOKIE_NAME);
  return token ? await verifyToken(token) : null;
}

/**
 * The security boundary for every private server function.
 *
 * Under Next.js, `src/proxy.ts` matched `/dashboard/:path*` and Server Action
 * POSTs went to the page URL, so the matcher covered them — which is why none
 * of the old action files carried an auth check. Server functions are RPC
 * endpoints under `/_serverFn/*`, outside any such matcher, and `beforeLoad`
 * is a UX guard rather than a security boundary. Every server function that
 * reads or writes private data must therefore carry this middleware.
 */
export const requireAdmin = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const admin = await readSession();
    if (!admin) throw redirect({ to: "/login" });
    return next({ context: { admin } });
  }
);

/** Read-only session probe, used by the dashboard route's beforeLoad. */
export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => readSession()
);

export const login = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<ActionState> => {
    if (!validateCredentials(data.username, data.password)) {
      return { success: false, error: "Sai tên đăng nhập hoặc mật khẩu." };
    }

    setCookie(SESSION_COOKIE_NAME, await createToken(), COOKIE_OPTIONS);
    return { success: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
  throw redirect({ to: "/login" });
});
