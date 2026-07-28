import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  expandCategorySubtree,
  getCategories,
  getShareLinkByCode,
  getTotalForCategories,
  getTransactionsForCategories,
} from "@/lib/db/queries";
import { getCategoryPath, getCategoryPathParts } from "@/lib/category-tree";

export const publicReportSchema = z.object({
  code: z.string().min(1),
  fromMonth: z.string().optional(),
  toMonth: z.string().optional(),
  category: z.string().optional(),
});

export type PublicReportSearch = Omit<
  z.infer<typeof publicReportSchema>,
  "code"
>;

export type PublicReportRow = {
  id: string;
  amount: number;
  note: string;
  date: string;
  categoryId: string;
  categoryName: string | null;
  /** Resolved server-side so the category tree never crosses the wire. */
  categoryPathParts: string[];
};

export type PublicReport = {
  linkName: string | null;
  transactions: PublicReportRow[];
  total: number;
  filterOptions: { id: string; label: string }[];
};

/**
 * Everything /p/$code renders, in one call, with no auth — this is the only
 * server function deliberately left unauthenticated.
 *
 * The Next.js page issued five queries and pulled the *entire* category table
 * to build filter labels and per-row category paths. That was harmless while
 * it stayed on the server; over RPC it would ship the whole tree to anonymous
 * visitors. Both are resolved here instead, so the response carries only what
 * the link's own scope justifies.
 */
export const fetchPublicReport = createServerFn({ method: "GET" })
  .validator(publicReportSchema)
  .handler(async ({ data }): Promise<PublicReport | null> => {
    const result = await getShareLinkByCode(data.code);
    // Returning null rather than throwing notFound(): the caller wraps this in
    // ensureQueryData, and the loader is the reliable place to raise it.
    if (!result) return null;

    const { link, categoryIds } = result;
    const linkSet = new Set(categoryIds);

    // Drill-down filter: narrow to one picked category's subtree, intersected
    // with the link's own scope so a hand-crafted ?category= cannot widen it.
    let effectiveIds = categoryIds;
    if (data.category && linkSet.has(data.category)) {
      const subtree = await expandCategorySubtree(data.category);
      effectiveIds = subtree.filter((id) => linkSet.has(id));
    }

    const range = { fromMonth: data.fromMonth, toMonth: data.toMonth };

    const [allCategories, rows, total] = await Promise.all([
      getCategories(),
      getTransactionsForCategories(effectiveIds, range),
      getTotalForCategories(effectiveIds, range),
    ]);

    const filterOptions = categoryIds
      .map((id) => ({ id, label: getCategoryPath(id, allCategories) }))
      .filter((o) => o.label)
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      linkName: link.name,
      total,
      filterOptions,
      transactions: rows.map((row) => ({
        id: row.id,
        amount: row.amount,
        note: row.note,
        date: row.date,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryPathParts: getCategoryPathParts(row.categoryId, allCategories),
      })),
    };
  });
