"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  validateCredentials,
  createToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import type { LoginInput } from "@/lib/schemas";
import type { ActionState } from "@/lib/types";

export async function loginAction(data: LoginInput): Promise<ActionState> {
  if (!data.username || !data.password) {
    return {
      success: false,
      error: "Vui lòng nhập tên đăng nhập và mật khẩu.",
    };
  }

  if (!validateCredentials(data.username, data.password)) {
    return { success: false, error: "Sai tên đăng nhập hoặc mật khẩu." };
  }

  const token = await createToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return { success: true };
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
