"use server";

import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  createToken,
  validateCredentials,
} from "@/lib/auth";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { COOKIE_OPTIONS } from "@/server/auth-guard";
import type { ActionState } from "@/lib/types";

/**
 * Deliberately unauthenticated, like `logout` and `fetchPublicReport` — this
 * is the endpoint that establishes the session in the first place.
 */
export async function login(input: LoginInput): Promise<ActionState> {
  const data = loginSchema.parse(input);
  if (!validateCredentials(data.username, data.password)) {
    return { success: false, error: "Sai tên đăng nhập hoặc mật khẩu." };
  }

  (await cookies()).set(
    SESSION_COOKIE_NAME,
    await createToken(),
    COOKIE_OPTIONS
  );
  return { success: true };
}

/**
 * Returns a plain success state rather than throwing a redirect — see the
 * plan's "Logout: evict, don't just invalidate" note. The dashboard shell
 * (PR 7) does the actual navigation client-side after this resolves.
 */
export async function logout(): Promise<ActionState> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return { success: true };
}
