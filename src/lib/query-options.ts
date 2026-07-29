import { queryOptions } from "@tanstack/react-query";
import { fetchSession } from "@/server/auth.functions";
import {
  fetchCategories,
  fetchShareLinks,
  fetchTransactions,
  type TransactionFilters,
} from "@/server/queries.functions";
import {
  fetchPublicReport,
  type PublicReportSearch,
} from "@/server/public.functions";
import { fetchThemePreference } from "@/server/theme.functions";

/**
 * Query keys double as the invalidation map that replaces revalidatePath.
 * `transactions` is keyed by filters, so invalidating the bare ["transactions"]
 * prefix clears every filter combination — matching what
 * revalidatePath("/dashboard") used to do.
 */
export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: ["session"] as const,
    queryFn: () => fetchSession(),
    // One round-trip per page load rather than per client-side navigation.
    staleTime: Infinity,
    gcTime: Infinity,
  });

/**
 * Same shape as `sessionQueryOptions`, and for the same reason: the root route
 * needs this on every navigation, and it only ever changes when this tab writes
 * the cookie itself. Caching it forever keeps client-side navigation free of an
 * extra round-trip; `persistTheme` updates the DOM directly, so nothing has to
 * re-read it to stay correct.
 */
export const themeQueryOptions = () =>
  queryOptions({
    queryKey: ["theme"] as const,
    queryFn: () => fetchThemePreference(),
    staleTime: Infinity,
    gcTime: Infinity,
  });

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["categories"] as const,
    queryFn: () => fetchCategories(),
  });

export const transactionsQueryOptions = (filters: TransactionFilters) =>
  queryOptions({
    queryKey: ["transactions", filters] as const,
    queryFn: () => fetchTransactions({ data: filters }),
  });

export const shareLinksQueryOptions = () =>
  queryOptions({
    queryKey: ["shareLinks"] as const,
    queryFn: () => fetchShareLinks(),
  });

export const publicReportQueryOptions = (
  code: string,
  search: PublicReportSearch
) =>
  queryOptions({
    queryKey: ["publicReport", code, search] as const,
    queryFn: () => fetchPublicReport({ data: { code, ...search } }),
  });
