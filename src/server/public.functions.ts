import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  expandCategorySubtree,
  getCategories,
  getShareLinkByCode,
  getTotalForCategories,
  getTransactionsForCategories,
} from "@/lib/db/queries";
import type { CategoryLike } from "@/lib/category-tree";
import { addMonths } from "@/lib/format";
import { monthRangeSchema, SHARE_CODE_SHAPE } from "@/lib/schemas";
import type { TransactionTableRow } from "@/lib/types";

export const publicReportSchema = monthRangeSchema.extend({
  // SHARE_CODE_SHAPE, not SHARE_CODE_PATTERN: this rejects values that could
  // never be a code, without imposing the 8-character write floor on links that
  // were handed out before that floor existed.
  code: z.string().regex(SHARE_CODE_SHAPE),
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
   * entitled to.
   *
   * Scope truncation has to hold on both fields or it holds on neither — see
   * `scopedPathParts`, which applies the same rule to each row's
   * `categoryPathParts`. Together they are what makes "no category outside the
   * link's scope is named" true of the whole response.
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

    /**
     * The category path for one row, truncated at the link's own scope.
     *
     * `getCategoryPathParts` walks to the true root, which names ancestors the
     * visitor was never granted: a link sharing only the leaf "Cơm trưa" would
     * ship ["Ăn uống", "Nhà hàng", "Cơm trưa"]. Climbing only while the node is
     * in scope keeps the visible path to categories this link actually covers.
     *
     * Every row's own category is in `effectiveIds` ⊆ `linkSet`, so this always
     * yields at least one part.
     */
    const scopedPathParts = (categoryId: string): string[] => {
      const parts: string[] = [];
      const guard = new Set<string>();
      let current = linkSet.has(categoryId) ? byId.get(categoryId) : undefined;
      while (current && !guard.has(current.id)) {
        parts.unshift(current.name);
        guard.add(current.id);
        const parentId = current.parentId;
        current =
          parentId && linkSet.has(parentId) ? byId.get(parentId) : undefined;
      }
      return parts;
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
        categoryPathParts: scopedPathParts(row.categoryId),
      })),
    };
  });
