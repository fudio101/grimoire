export type ActionState = {
  success: boolean;
  error?: string;
};

/** The two dimensions of a transaction, as every read path returns them. */
export type TransactionRow = {
  id: string;
  amount: number;
  note: string;
  date: string;
  purposeId: string;
  purposeName: string;
  fundingSourceId: string;
  fundingSourceName: string;
  /** Tie-break for the default ordering; queries already select it. */
  createdAt: string;
};

/**
 * What the shared table renders.
 *
 * Identical to `TransactionRow` now that both dimensions travel with the row.
 * It used to carry a `categoryPathParts` breadcrumb that each surface had to
 * resolve for itself — the dashboard by walking its own category list, the
 * public report by climbing only as far as the link's scope allowed. A flat
 * pair of names needs neither walk, and there is no ancestor to leak.
 */
export type TransactionTableRow = TransactionRow;

/** One Funding Source's share of a Purpose's Gross cost. */
export type FundingShare = { id: string; name: string; total: number };

/**
 * A Purpose's Gross cost for the month, and how it was funded.
 *
 * `byFundingSource` partitions exactly the rows `total` sums, so the shares
 * always add back up to it. That identity is the whole point: the self-paid
 * and covered figures a reader compares are two slices of one number, not two
 * independently computed ones that might disagree.
 */
export type PurposeTotal = {
  id: string;
  name: string;
  total: number;
  byFundingSource: FundingShare[];
};

export type OverviewData = {
  month: string;
  total: number;
  /** The month before `month`, for the comparison line. */
  previousTotal: number;
  count: number;
  /** Descending by Gross cost — what the money was spent on. */
  byPurpose: PurposeTotal[];
  /** Exactly 6 entries (see `overview.queries.ts`), zero-filled, oldest first. */
  monthlySeries: { month: string; total: number }[];
};

/**
 * One entry of either dimension, as a picker or a filter needs it: id and
 * name, nothing more. Shared by the chips, the public report's filter lists
 * and anything else that offers a flat choice.
 */
export type DimensionOption = { id: string; name: string };

/** A Purpose as the public report ships it. Same shape; the name says which. */
export type PurposeOption = DimensionOption;

export type PublicReport = {
  linkName: string | null;
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
   * The link's own Purposes — a flat list, exactly the link's scope and
   * nothing else.
   *
   * This used to be a tree that had to be re-parented on the way out, so a
   * Purpose whose parent was not shared did not dangle at a name the visitor
   * was never granted. With no hierarchy there is nothing to re-parent and no
   * ancestor to hide.
   */
  filterPurposes: PurposeOption[];
  /**
   * Every Funding Source that paid for any of the link's Purposes, so the
   * reader can look at one pot at a time. A view filter, not scope — see the
   * amendment on ADR-0002. Derived from the scoped rows, so a pot that never
   * funded a shared Purpose is not offered.
   */
  filterFundingSources: DimensionOption[];
};
