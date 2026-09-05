import "server-only";
import { getTotalsByMonth, getTransactions } from "@/lib/db/queries";
import { addMonths } from "@/lib/format";
import type { OverviewData } from "@/lib/types";

/** How many months the overview trend covers, including the selected one. */
const SERIES_MONTHS = 6;

/**
 * Everything the overview screen renders, in one call. Called both by
 * `app/api/overview/route.ts` (after its own auth check, for client
 * refetches) and directly by the dashboard page's server component during
 * prefetch — no auth check in here, since neither caller needs a second one:
 * the Route Handler already did its own, and the page is only ever reached
 * through `app/dashboard/layout.tsx`'s `readSession()` redirect.
 *
 * The roll-up is by **Purpose**, so the headline chart answers "what was the
 * money spent on?". It used to climb each row's category to its root ancestor,
 * which answered "which pot did it come from?" — a different question, and not
 * the one the screen is asking. That climb is also why this needed the whole
 * category table; it now needs nothing but the rows.
 *
 * Each Purpose carries its Gross cost plus the split across Funding Sources
 * that produced it. The split is a partition of the same rows, so the shares
 * always sum back to the Gross cost — the identity is what makes it safe to
 * render one under the other.
 */
export async function getOverview(month: string): Promise<OverviewData> {
  const seriesStart = addMonths(month, -(SERIES_MONTHS - 1));

  const [totals, rows] = await Promise.all([
    // Starts one month before the series so the comparison month is covered
    // by the same query rather than costing a second round-trip.
    getTotalsByMonth(addMonths(month, -SERIES_MONTHS), month),
    getTransactions({ fromMonth: month, toMonth: month }),
  ]);

  const byMonth = new Map(totals.map((t) => [t.month, t.total]));

  type Bucket = {
    id: string;
    name: string;
    total: number;
    byFundingSource: Map<string, { id: string; name: string; total: number }>;
  };
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    let bucket = buckets.get(row.purposeId);
    if (!bucket) {
      bucket = {
        id: row.purposeId,
        name: row.purposeName,
        total: 0,
        byFundingSource: new Map(),
      };
      buckets.set(row.purposeId, bucket);
    }
    bucket.total += row.amount;

    const share = bucket.byFundingSource.get(row.fundingSourceId);
    if (share) {
      share.total += row.amount;
    } else {
      bucket.byFundingSource.set(row.fundingSourceId, {
        id: row.fundingSourceId,
        name: row.fundingSourceName,
        total: row.amount,
      });
    }
  }

  return {
    month,
    total: byMonth.get(month) ?? 0,
    previousTotal: byMonth.get(addMonths(month, -1)) ?? 0,
    count: rows.length,
    byPurpose: [...buckets.values()]
      .sort((a, b) => b.total - a.total)
      .map((bucket) => ({
        id: bucket.id,
        name: bucket.name,
        total: bucket.total,
        byFundingSource: [...bucket.byFundingSource.values()].sort(
          (a, b) => b.total - a.total
        ),
      })),
    monthlySeries: Array.from({ length: SERIES_MONTHS }, (_, i) => {
      const m = addMonths(seriesStart, i);
      return { month: m, total: byMonth.get(m) ?? 0 };
    }),
  };
}
