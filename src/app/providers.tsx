"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { z } from "zod";
import { getQueryClient } from "@/lib/query-client";
import { Toaster } from "@/components/ui/toast";
import { ThemePreferenceProvider } from "./theme-context";
import type { ThemePreference } from "@/lib/theme";

/**
 * Zod probes for JIT support by running `new Function("")` inside a try/catch.
 * Under this app's CSP (`script-src` without `'unsafe-eval'`, see
 * `src/proxy.ts`) the probe throws, Zod swallows it and falls back to its
 * non-JIT validators — nothing breaks — but the browser still reports a
 * `securitypolicyviolation` for the attempt. Zod documents exactly this in
 * `zod/v4/core/util.cjs`, and `jitless` is its own answer: skip the probe.
 *
 * Declaring it here rather than in `src/lib/schemas.ts` keeps it client-only.
 * The server has no CSP and no reason to give up the faster compiled path, and
 * `schemas.ts` is imported by both.
 *
 * This is not a performance change disguised as a CSP fix: JIT is unavailable
 * on the client either way. All this removes is the violation report — which
 * matters, because one permanent entry in the console is how a real violation
 * later goes unnoticed.
 */
z.config({ jitless: true });

export function Providers({
  themePreference,
  children,
}: {
  themePreference: ThemePreference;
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider value={themePreference}>
        <Toaster>{children}</Toaster>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}
