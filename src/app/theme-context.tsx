"use client";

import { createContext, useContext } from "react";
import { DEFAULT_THEME_PREFERENCE, type ThemePreference } from "@/lib/theme";

/**
 * Root layout reads the theme cookie once, server-side, via `cookies()` — the
 * same value `theme.functions.ts`'s `fetchThemePreference` reads today. This
 * context is how that one read reaches every client component under it
 * (dashboard shell, login page, public report) without each one re-reading the
 * cookie itself or a Start-style route-context lookup, neither of which exist
 * here. `ThemeToggle` itself does not consume this — it takes `themePreference`
 * as a prop (see PR 3) — this context is only how each page/layout obtains the
 * value to pass down.
 */
const ThemePreferenceContext = createContext<ThemePreference>(
  DEFAULT_THEME_PREFERENCE
);

export const ThemePreferenceProvider = ThemePreferenceContext.Provider;

export function useThemePreference(): ThemePreference {
  return useContext(ThemePreferenceContext);
}
