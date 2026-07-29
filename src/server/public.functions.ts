import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  expandCategorySubtree,
  getCategories,
  getShareLinkByCode,
  getTotalForCategories,
  getTransactionsForCategories,
} from "@/lib/db/queries";
import { getCategoryPathParts, type CategoryLike } from "@/lib/category-tree";
import { addMonths } from "@/lib/format";
import type { TransactionTableRow } from "@/lib/types";

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

export type PublicReport = {
  linkName: string | null;
  /** categoryPathParts is resolved here so the category tree never ships. */
  transactions: TransactionTableRow[];
  total: number;
  /**
   * The same scope one month earlier, for the comparison line.
   *
   * null when the view is not a single month: "more than last month" has no
   * meaning against a six-month range, and showing a number anyway would be
   * worse than showing nothing.
   */
  previousTotal: number | null;
  /**
   * The link's own categories, shaped so the same drill-down picker the
   * dashboard uses can render them.
   *
   * `parentId` points at the nearest ancestor that is *also* in scope, or null.
   * That keeps the tree self-contained: a category whose parent was not shared
   * appears as a root here rather than dangling at a name the visitor is not
   * entitled to. No category outside the link's scope is named, and the paths
   * this reconstructs are the same ones the previous `label` field already
   * spelled out — so this ships no information the old shape did not.
   */
  filterCategories: CategoryLike[];
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

    // Only a single-month view has a meaningful "previous month".
    const singleMonth =
      data.fromMonth && data.fromMonth === data.toMonth ? data.fromMonth : null;
    const previousMonth = singleMonth ? addMonths(singleMonth, -1) : null;

    const [allCategories, rows, total, previousTotal] = await Promise.all([
      getCategories(),
      getTransactionsForCategories(effectiveIds, range),
      getTotalForCategories(effectiveIds, range),
      previousMonth
        ? getTotalForCategories(effectiveIds, {
            fromMonth: previousMonth,
            toMonth: previousMonth,
          })
        : Promise.resolve(null),
    ]);

    const byId = new Map(allCategories.map((c) => [c.id, c]));
    const nearestInScopeAncestor = (id: string): string | null => {
      let current = byId.get(id)?.parentId ?? null;
      const guard = new Set<string>();
      while (current && !guard.has(current)) {
        if (linkSet.has(current)) return current;
        guard.add(current);
        current = byId.get(current)?.parentId ?? null;
      }
      return null;
    };

    const filterCategories: CategoryLike[] = categoryIds
      .map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({
        id: c.id,
        name: c.name,
        parentId: nearestInScopeAncestor(c.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));

    return {
      linkName: link.name,
      total,
      previousTotal,
      filterCategories,
      transactions: rows.map((row) => ({
        id: row.id,
        amount: row.amount,
        note: row.note,
        date: row.date,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        createdAt: row.createdAt,
        categoryPathParts: getCategoryPathParts(row.categoryId, allCategories),
      })),
    };
  });
