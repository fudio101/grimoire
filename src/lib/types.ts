import type { CategoryLike } from "@/lib/category-tree";

export type ActionState = {
  success: boolean;
  error?: string;
};

export type TransactionRow = {
  id: string;
  amount: number;
  note: string;
  date: string;
  categoryId: string;
  categoryName: string | null;
  /** Tie-break for the default ordering; queries already select it. */
  createdAt: string;
};

/**
 * What the shared table renders. `categoryPathParts` is resolved by whoever
 * owns the category data: the dashboard walks its own category list, while
 * /p/[code] receives it precomputed so the tree never reaches the client.
 */
export type TransactionTableRow = TransactionRow & {
  categoryPathParts: string[];
};

export type OverviewData = {
  month: string;
  total: number;
  /** The month before `month`, for the comparison line. */
  previousTotal: number;
  count: number;
  /** Descending by total, rolled up to top-level categories. */
  byRootCategory: { id: string; name: string; total: number }[];
  /** Exactly 6 entries (see `overview.queries.ts`), zero-filled, oldest first. */
  monthlySeries: { month: string; total: number }[];
};

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
   * `parentId` points at the nearest ancestor that is *also* in scope, or
   * null. That keeps the tree self-contained: a category whose parent was
   * not shared appears as a root here rather than dangling at a name the
   * visitor is not entitled to.
   */
  filterCategories: CategoryLike[];
};
