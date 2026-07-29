import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COOKIE_NAME,
  isThemePreference,
  type ThemePreference,
} from "@/lib/theme";

/**
 * Deliberately unauthenticated, alongside `login`, `logout`, `fetchSession` and
 * `fetchPublicReport`. It exposes nothing but the caller's own display
 * preference, and `/p/$code` needs it too — a shared report should honour the
 * reader's theme even though that reader never signs in.
 *
 * There is no matching write function: the cookie is set client-side in
 * `persistTheme`, so switching theme costs no round-trip.
 */
export const fetchThemePreference = createServerFn({ method: "GET" }).handler(
  async (): Promise<ThemePreference> => {
    const raw = getCookie(THEME_COOKIE_NAME);
    return isThemePreference(raw) ? raw : DEFAULT_THEME_PREFERENCE;
  }
);
