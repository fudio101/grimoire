import "server-only";
import {
  getShareLinkByCode,
  getTotalForCategories,
  getTransactionsForCategories,
  getCategories,
} from "@/lib/db/queries";
import { getDescendantIds } from "@/lib/category-tree";
import { addMonths } from "@/lib/format";
import type { PublicReportSearch } from "@/lib/schemas";
import type { PublicReport } from "@/lib/types";

/**
 * Everything /p/[code] renders, in one call, with no auth — this is one of
 * only two public surfaces in the app (the other is `login`).
 *
 * Called both by `app/api/public-report/route.ts` (for client refetches, no
 * auth check there either — see that file for why) and directly by the
 * public report page's server component during prefetch.
 *
 * A naive port would issue five separate queries and pull the *entire*
 * category table to build filter labels and per-row category paths. Both
 * are resolved here instead, from one read of the category table, so the
 * response carries only what the link's own scope justifies — never the
 * whole tree to an anonymous visitor.
 */
export async function getPublicReport(
  input: PublicReportSearch & { code: string }
): Promise<PublicReport | null> {
  const result = await getShareLinkByCode(input.code);
  // Returning null rather than throwing notFound(): the caller (the Route
  // Handler, or the page's own prefetch) decides how to answer "not found".
  if (!result) return null;

  const { link, categoryIds } = result;
  const linkSet = new Set(categoryIds);

  // Read the category table once and answer every question below from it.
  const allCategories = await getCategories();
  const byId = new Map(allCategories.map((c) => [c.id, c]));

  // Drill-down filter: narrow to one picked category's subtree, intersected
  // with the link's own scope so a hand-crafted ?category= cannot widen it.
  let effectiveIds = categoryIds;
  if (input.category && linkSet.has(input.category)) {
    const subtree = [
      input.category,
      ...getDescendantIds(input.category, allCategories),
    ];
    effectiveIds = subtree.filter((id) => linkSet.has(id));
  }

  const range = { fromMonth: input.fromMonth, toMonth: input.toMonth };

  // Only a single-month view has a meaningful "previous month".
  const singleMonth =
    input.fromMonth && input.fromMonth === input.toMonth
      ? input.fromMonth
      : null;
  const previousMonth = singleMonth ? addMonths(singleMonth, -1) : null;

  const [rows, total, previousTotal] = await Promise.all([
    getTransactionsForCategories(effectiveIds, range),
    getTotalForCategories(effectiveIds, range),
    previousMonth
      ? getTotalForCategories(effectiveIds, {
          fromMonth: previousMonth,
          toMonth: previousMonth,
        })
      : Promise.resolve(null),
  ]);
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
   * Every row's own category is in `effectiveIds` ⊆ `linkSet`, so this
   * always yields at least one part.
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

  const filterCategories = categoryIds
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
}
