import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCategories,
  getShareLinks,
  getRecentCategories,
  getTotalsByMonth,
  getTransactions,
} from "@/lib/db/queries";
import { requireAdmin } from "@/server/auth.functions";
import { addMonths } from "@/lib/format";
import { getRootCategory, indexCategories } from "@/lib/category-tree";
import { monthRangeSchema, monthSchema } from "@/lib/schemas";

export const transactionFilterSchema = monthRangeSchema.extend({
  category: z.string().optional(),
});

export type TransactionFilters = z.infer<typeof transactionFilterSchema>;

export const fetchCategories = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => getCategories());

export const fetchTransactions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator(transactionFilterSchema)
  .handler(async ({ data }) =>
    getTransactions({
      fromMonth: data.fromMonth,
      toMonth: data.toMonth,
      categoryId: data.category,
    })
  );

export const fetchShareLinks = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => getShareLinks());

/** Quick-pick chips for the transaction form. Private data — requireAdmin. */
export const fetchRecentCategories = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => getRecentCategories());

/** How many months the overview trend covers, including the selected one. */
const SERIES_MONTHS = 6;

export const overviewSchema = z.object({
  month: monthSchema,
});

export type OverviewData = {
  month: string;
  total: number;
  /** The month before `month`, for the comparison line. */
  previousTotal: number;
  count: number;
  /** Descending by total, rolled up to top-level categories. */
  byRootCategory: { id: string; name: string; total: number }[];
  /** Exactly SERIES_MONTHS entries, zero-filled, oldest first. */
  monthlySeries: { month: string; total: number }[];
};

/**
 * Everything the overview screen renders, in one call.
 *
 * The category roll-up happens here rather than in SQL: the tree is small, the
 * recursion is already written in `getRootCategory`, and a recursive CTE would
 * buy nothing but a second place for the parent-walk logic to live.
 */
export const fetchOverview = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator(overviewSchema)
  .handler(async ({ data }): Promise<OverviewData> => {
    const { month } = data;
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
  });
