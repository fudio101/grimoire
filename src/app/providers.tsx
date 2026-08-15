"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { Toaster } from "@/components/ui/toast";
import { ThemePreferenceProvider } from "./theme-context";
import type { ThemePreference } from "@/lib/theme";

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
