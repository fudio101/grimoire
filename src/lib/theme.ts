export const THEME_COOKIE_NAME = "theme";

/** What the user picked. "system" defers to the OS setting at render time. */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs synchronously in <head>, before the browser paints anything.
 *
 * The server knows the stored preference and renders `class="dark"` for an
 * explicit choice, so that case needs no script. "system" is the case that does:
 * it is the default, it depends on a value only the browser holds, and getting
 * it wrong means every dark-mode user sees a white flash on every page load.
 * Resolving it here rather than in an effect is the difference between "no
 * flash" and "flash on every navigation that remounts the document".
 *
 * Kept dependency-free and wrapped in try/catch: if this throws, the page must
 * still render, just in the server-rendered theme.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var m=document.cookie.match(/(?:^|;\\s*)theme=([^;]*)/);
var p=m?decodeURIComponent(m[1]):"${DEFAULT_THEME_PREFERENCE}";
var d=p==="dark"||(p==="system"&&window.matchMedia("${DARK_MEDIA_QUERY}").matches);
document.documentElement.classList.toggle("dark",d);
}catch(e){}})();`;

/** Resolve a preference to the class that should sit on <html>, client-side. */
export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

/**
 * Persist the choice and apply it immediately.
 *
 * The cookie is intentionally not httpOnly — it carries no authority, only a
 * display preference, and writing it here avoids a server round-trip for what
 * should feel instant. It still reaches the server on the next request, which
 * is what lets SSR render the right theme.
 */
export function persistTheme(preference: ThemePreference) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE_NAME}=${preference}; path=/; max-age=${oneYear}; samesite=lax`;
  document.documentElement.classList.toggle(
    "dark",
    resolveTheme(preference) === "dark"
  );
}
