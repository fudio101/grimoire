import { z } from "zod";
import { monthRangeSearchSchema, monthSchema } from "@/lib/schemas";

/**
 * One parser per search-param route, and one place the URL contract is
 * written down.
 *
 * A server `page.tsx` parses its own `searchParams` prop and hands the result
 * to its paired client view, which uses it to build both its query key and the
 * hrefs it navigates to. The App Router gives neither side a shared choke
 * point the way a router's own `validateSearch` would, so the parse, the query
 * key and the href are three places one parameter name could be spelled
 * differently. Naming it once, here, is what stops that.
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
  purpose: z.string().optional(),
  fundingSource: z.string().optional(),
});

export type TransactionSearch = z.infer<typeof transactionSearchSchema>;

export function parseTransactionSearch(search: unknown): TransactionSearch {
  return transactionSearchSchema.parse(search);
}

/**
 * The public report reads the same four view filters as the dashboard, so it
 * shares the schema. A share link's *scope* is still one-dimensional
 * (ADR-0002) — that is a property of the permission model, enforced in
 * `getPublicReport` by intersecting `purpose` with the link's own Purposes.
 * `fundingSource` is not scope: it narrows rows the scope already allows, and
 * can reveal nothing a reader could not already see in the funding split. The
 * separate name and type stay so a future divergence has somewhere to land.
 */
const publicReportSearchSchema = transactionSearchSchema;

export type PublicReportUrlSearch = z.infer<typeof publicReportSearchSchema>;

/**
 * The inverse of the parsers: a parsed search back to a query string, for
 * hrefs. Both client views used to spell the four parameter names again in
 * their own `buildHref`, which is exactly the drift CLAUDE.md's "routes are
 * unchecked strings" note warns about — here they are spelled once more, and
 * `search-params.test.ts` round-trips them through the parsers.
 */
export function toSearchString(search: Partial<TransactionSearch>): string {
  const params = new URLSearchParams();
  for (const key of [
    "fromMonth",
    "toMonth",
    "purpose",
    "fundingSource",
  ] as const) {
    const value = search[key];
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function parsePublicReportSearch(
  search: unknown
): PublicReportUrlSearch {
  return publicReportSearchSchema.parse(search);
}

/**
 * Next's async `searchParams` prop hands back an array for a repeated key
 * (`?purpose=a&purpose=b`); `URLSearchParams.get()` — what every client
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

/** Next's `searchParams` prop, before any narrowing. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * The parsers a `page.tsx` actually calls: hand them Next's raw
 * `searchParams` and they pick and validate in one step.
 *
 * This exists because the two halves used to be spelled out at each call site
 * — `parseXSearch({ purpose: pickSearchParam(raw.purpose), ... })` — which put
 * the parameter's *name* in two places per route and gave nothing a chance to
 * notice when they disagreed. The parsers take `unknown` (Next's shape is
 * genuinely unknown) so a mistyped key is not an excess-property error, and
 * zod strips what it does not recognise, so the wrong name reads as "absent"
 * rather than as a mistake. That is precisely how `/p/[code]` kept reading
 * `?category=` after the parameter had been renamed: SSR silently ignored the
 * filter while the client honoured it, which is a server/client query-key
 * mismatch presenting as a hydration flicker.
 *
 * With the names written once, here, the routes cannot drift from the schemas.
 */
export function readOverviewSearch(raw: RawSearchParams): OverviewSearch {
  return parseOverviewSearch({ month: pickSearchParam(raw.month) });
}

export function readTransactionSearch(raw: RawSearchParams): TransactionSearch {
  return parseTransactionSearch({
    fromMonth: pickSearchParam(raw.fromMonth),
    toMonth: pickSearchParam(raw.toMonth),
    purpose: pickSearchParam(raw.purpose),
    fundingSource: pickSearchParam(raw.fundingSource),
  });
}

export function readPublicReportSearch(
  raw: RawSearchParams
): PublicReportUrlSearch {
  return parsePublicReportSearch({
    fromMonth: pickSearchParam(raw.fromMonth),
    toMonth: pickSearchParam(raw.toMonth),
    purpose: pickSearchParam(raw.purpose),
    fundingSource: pickSearchParam(raw.fundingSource),
  });
}
