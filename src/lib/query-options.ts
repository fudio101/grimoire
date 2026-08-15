import { queryOptions } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import type { TransactionFilters, PublicReportSearch } from "@/lib/schemas";
import type { Category } from "@/lib/db/schema";
import type { ShareLinkWithCategories } from "@/lib/db/queries";
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
 */
export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["categories"] as const,
    queryFn: () => fetchJson<Category[]>("/api/categories"),
  });

export const transactionsQueryOptions = (filters: TransactionFilters) =>
  queryOptions({
    queryKey: ["transactions", filters] as const,
    queryFn: () =>
      fetchJson<TransactionRow[]>("/api/transactions", {
        fromMonth: filters.fromMonth,
        toMonth: filters.toMonth,
        category: filters.category,
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

/** Invalidated by the bare ["recentCategories"] key on any transaction write. */
export const recentCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["recentCategories"] as const,
    queryFn: () =>
      fetchJson<{ id: string; name: string }[]>("/api/recent-categories"),
  });

export const shareLinksQueryOptions = () =>
  queryOptions({
    queryKey: ["shareLinks"] as const,
    queryFn: () => fetchJson<ShareLinkWithCategories[]>("/api/share-links"),
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
        category: search.category,
      }),
  });
