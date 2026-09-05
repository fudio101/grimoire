import { Suspense } from "react";
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getFundingSources, getPurposes } from "@/lib/db/queries";
import { getQueryClient } from "@/lib/query-client";
import {
  fundingSourcesQueryOptions,
  purposesQueryOptions,
} from "@/lib/query-options";
import { readSession } from "@/server/auth-guard";
import { DashboardShell } from "./dashboard-shell";

/**
 * Replaces `src/proxy.ts` / `dashboard/route.tsx`'s `beforeLoad`. This is a
 * UX guard only — it keeps signed-out visitors off the screen, and (like
 * `beforeLoad`) also runs on every client-side navigation because the App
 * Router re-fetches this layout's RSC payload on navigation too. The actual
 * security boundary is `requireAuth`/`requireAuthForAction` on every
 * private Server Action and Route Handler — see `src/server/auth-guard.ts`.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await readSession();
  if (!admin) redirect("/login");

  const queryClient = getQueryClient();
  const [purposes, fundingSources] = await Promise.all([
    getPurposes(),
    getFundingSources(),
  ]);
  queryClient.setQueryData(purposesQueryOptions().queryKey, purposes);
  queryClient.setQueryData(
    fundingSourcesQueryOptions().queryKey,
    fundingSources
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/*
       * `DashboardShell` reads both dimensions with `useSuspenseQuery`. The
       * hydrated cache above always has fresh data by the time this renders,
       * so this boundary should never actually suspend visibly — it exists
       * so a cache miss (e.g. right after `queryClient.removeQueries()` on
       * sign-out, mid-redirect) fails safely instead of an uncaught error.
       */}
      <Suspense fallback={null}>
        <DashboardShell>{children}</DashboardShell>
      </Suspense>
    </HydrationBoundary>
  );
}
