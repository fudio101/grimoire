import "server-only";
import {
  getCategories,
  getTotalsByMonth,
  getTransactions,
} from "@/lib/db/queries";
import { addMonths } from "@/lib/format";
import { getRootCategory, indexCategories } from "@/lib/category-tree";
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
 * The category roll-up happens here rather than in SQL: the tree is small,
 * the recursion is already written in `getRootCategory`, and a recursive CTE
 * would buy nothing but a second place for the parent-walk logic to live.
 */
export async function getOverview(month: string): Promise<OverviewData> {
  const seriesStart = addMonths(month, -(SERIES_MONTHS - 1));

  const [totals, rows, allCategories] = await Promise.all([
    // Starts one month before the series so the comparison month is covered
    // by the same query rather than costing a second round-trip.
    getTotalsByMonth(addMonths(month, -SERIES_MONTHS), month),
    getTransactions({ fromMonth: month, toMonth: month }),
    getCategories(),
  ]);

  const byMonth = new Map(totals.map((t) => [t.month, t.total]));

  // Hoisted: getRootCategory is called once per row and would otherwise
  // rebuild this index each time.
  const categoryIndex = indexCategories(allCategories);

  const buckets = new Map<
    string,
    { id: string; name: string; total: number }
  >();
  for (const row of rows) {
    if (!row.categoryId) continue;
    const root = getRootCategory(row.categoryId, categoryIndex);
    const id = root?.id ?? row.categoryId;
    const existing = buckets.get(id);
    if (existing) {
      existing.total += row.amount;
    } else {
      buckets.set(id, {
        id,
        name: root?.name ?? row.categoryName ?? "Khác",
        total: row.amount,
      });
    }
  }

  return {
    month,
    total: byMonth.get(month) ?? 0,
    previousTotal: byMonth.get(addMonths(month, -1)) ?? 0,
    count: rows.length,
    byRootCategory: [...buckets.values()].sort((a, b) => b.total - a.total),
    monthlySeries: Array.from({ length: SERIES_MONTHS }, (_, i) => {
      const m = addMonths(seriesStart, i);
      return { month: m, total: byMonth.get(m) ?? 0 };
    }),
  };
}
