import { queryOptions } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import type { TransactionFilters, PublicReportSearch } from "@/lib/schemas";
import type { FundingSource, Purpose } from "@/lib/db/schema";
import type { ShareLinkWithPurposes } from "@/lib/db/queries";
import type { OverviewData, PublicReport, TransactionRow } from "@/lib/types";

/**
 * Query keys double as the invalidation map that replaces revalidatePath.
 * `transactions` is keyed by filters, so invalidating the bare ["transactions"]
 * prefix clears every filter combination — matching what
 * revalidatePath("/dashboard") used to do.
 *
 * Every `queryFn` below fetches its matching `app/api/*` Route Handler — see
 * `src/lib/api.ts` for why, and why an RSC page's own prefetch calls the
 * underlying server function directly instead of going through these.
 * `sessionQueryOptions`/`themeQueryOptions` are gone: the App Router reads
 * both directly, server-side, on every navigation (`readSession()` in
 * `app/dashboard/layout.tsx`, `cookies()` in the root layout) — there is no
 * client round-trip left for either to save.
 *
 * The paths below are plain strings that no compiler checks, so
 * `route-targets.test.ts` asserts each one resolves to a real `route.ts`. A
 * renamed route would otherwise fail only at runtime, and only on the client
 * half — an RSC prefetch calls the query function directly and would still
 * render, which reads as a hydration bug rather than a dead route.
 */
export const purposesQueryOptions = () =>
  queryOptions({
    queryKey: ["purposes"] as const,
    queryFn: () => fetchJson<Purpose[]>("/api/purposes"),
  });

/** The second dimension. Independent of Purposes, and keyed separately. */
export const fundingSourcesQueryOptions = () =>
  queryOptions({
    queryKey: ["fundingSources"] as const,
    queryFn: () => fetchJson<FundingSource[]>("/api/funding-sources"),
  });

export const transactionsQueryOptions = (filters: TransactionFilters) =>
  queryOptions({
    queryKey: ["transactions", filters] as const,
    queryFn: () =>
      fetchJson<TransactionRow[]>("/api/transactions", {
        fromMonth: filters.fromMonth,
        toMonth: filters.toMonth,
        purpose: filters.purpose,
        fundingSource: filters.fundingSource,
      }),
  });

/**
 * Keyed by month so stepping back and forth is instant after the first visit.
 * Transaction mutations invalidate the bare ["overview"] prefix, which clears
 * every month at once — the same prefix trick the transactions key relies on.
 */
export const overviewQueryOptions = (month: string) =>
  queryOptions({
    queryKey: ["overview", month] as const,
    queryFn: () => fetchJson<OverviewData>("/api/overview", { month }),
  });

/** Invalidated by the bare ["recentPurposes"] key on any transaction write. */
export const recentPurposesQueryOptions = () =>
  queryOptions({
    queryKey: ["recentPurposes"] as const,
    queryFn: () =>
      fetchJson<{ id: string; name: string }[]>("/api/recent-purposes"),
  });

export const shareLinksQueryOptions = () =>
  queryOptions({
    queryKey: ["shareLinks"] as const,
    queryFn: () => fetchJson<ShareLinkWithPurposes[]>("/api/share-links"),
  });

export const publicReportQueryOptions = (
  code: string,
  search: PublicReportSearch
) =>
  queryOptions({
    queryKey: ["publicReport", code, search] as const,
    queryFn: () =>
      fetchJson<PublicReport | null>("/api/public-report", {
        code,
        fromMonth: search.fromMonth,
        toMonth: search.toMonth,
        purpose: search.purpose,
        fundingSource: search.fundingSource,
      }),
  });
