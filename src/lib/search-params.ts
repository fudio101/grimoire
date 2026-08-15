import { z } from "zod";
import { monthRangeSearchSchema, monthSchema } from "@/lib/schemas";

/**
 * One parser per search-param route, shared by whatever reads the URL: a
 * server `page.tsx` parses its own `searchParams` prop and its paired client
 * view parses `useSearchParams()` off the same URL, and the App Router gives
 * neither side a shared choke point the way a router's own `validateSearch`
 * would. Routing both through the same function here is what keeps them
 * deriving identical query keys instead of each building its own schema and
 * risking two different answers for the same URL.
 *
 * All three are lenient (`.catch(undefined)`, matching `monthRangeSearchSchema`):
 * a malformed value degrades to "no bound" rather than throwing. URLs get
 * hand-edited, truncated by chat clients, and shared long after the UI that
 * produced them changed — answering a mangled query param with a full-page
 * error is worse than answering with an unfiltered view.
 */
const overviewSearchSchema = z.object({
  month: monthSchema.optional().catch(undefined),
});

export type OverviewSearch = z.infer<typeof overviewSearchSchema>;

export function parseOverviewSearch(search: unknown): OverviewSearch {
  return overviewSearchSchema.parse(search);
}

const transactionSearchSchema = monthRangeSearchSchema.extend({
  category: z.string().optional(),
});

export type TransactionSearch = z.infer<typeof transactionSearchSchema>;

export function parseTransactionSearch(search: unknown): TransactionSearch {
  return transactionSearchSchema.parse(search);
}

/**
 * Same shape as `parseTransactionSearch` today — both are `monthRangeSearchSchema`
 * plus an optional `category` — but kept as its own function rather than a
 * shared alias, since the public report and the dashboard's own transactions
 * screen are different surfaces with different callers and no reason to be
 * forced to change in lockstep if one's validation needs diverge later.
 */
const publicReportSearchSchema = monthRangeSearchSchema.extend({
  category: z.string().optional(),
});

export type PublicReportUrlSearch = z.infer<typeof publicReportSearchSchema>;

export function parsePublicReportSearch(
  search: unknown
): PublicReportUrlSearch {
  return publicReportSearchSchema.parse(search);
}

/**
 * Next's async `searchParams` prop hands back an array for a repeated key
 * (`?category=a&category=b`); `URLSearchParams.get()` — what every client
 * component here uses to read the same URL — always returns the first
 * occurrence. Narrowing here, before either `parseXSearch` sees the value, is
 * what keeps the server and client side deriving the same key from the same
 * URL (see the header comment above on why that matters).
 */
export function pickSearchParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
