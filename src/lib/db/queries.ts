import "server-only";
import { db } from "@/lib/db";
import {
  fundingSources,
  purposes,
  transactions,
  shareLinks,
  shareLinkPurposes,
} from "@/lib/db/schema";
import { eq, and, gte, lt, desc, sql, inArray } from "drizzle-orm";
import type { ShareLink } from "@/lib/db/schema";

export async function getPurposes() {
  return db.select().from(purposes).orderBy(purposes.name);
}

export async function getFundingSources() {
  return db.select().from(fundingSources).orderBy(fundingSources.name);
}

function nextMonthStart(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  return `${nextYear}-${String(nextMon).padStart(2, "0")}-01`;
}

/** Every column the list and report views render, joined to both dimensions. */
const transactionSelection = {
  id: transactions.id,
  amount: transactions.amount,
  note: transactions.note,
  date: transactions.date,
  purposeId: transactions.purposeId,
  purposeName: purposes.name,
  fundingSourceId: transactions.fundingSourceId,
  fundingSourceName: fundingSources.name,
  createdAt: transactions.createdAt,
} as const;

/**
 * Inner joins, not left: both foreign keys are `NOT NULL` and enforced (the
 * connection sets `foreign_keys = ON`), so a row with no Purpose or no Funding
 * Source cannot exist. A left join here would only add a `| null` to every
 * caller's type for a case the database forbids.
 */
function selectTransactions() {
  return db
    .select(transactionSelection)
    .from(transactions)
    .innerJoin(purposes, eq(transactions.purposeId, purposes.id))
    .innerJoin(
      fundingSources,
      eq(transactions.fundingSourceId, fundingSources.id)
    );
}

function monthConditions(filters?: { fromMonth?: string; toMonth?: string }) {
  const conditions = [];
  if (filters?.fromMonth) {
    conditions.push(gte(transactions.date, `${filters.fromMonth}-01`));
  }
  if (filters?.toMonth) {
    conditions.push(lt(transactions.date, nextMonthStart(filters.toMonth)));
  }
  return conditions;
}

export type TransactionFilterInput = {
  fromMonth?: string;
  toMonth?: string;
  purposeId?: string;
  fundingSourceId?: string;
};

/**
 * The transaction list, narrowed by any combination of the two dimensions.
 *
 * Both filters are plain column comparisons. Selecting a Purpose used to mean
 * expanding a subtree — a second query, then an `IN` over its ids — which is
 * what made "what has this cost in total?" unanswerable: the matching leaves
 * sat in different branches and the filter took one id. Flat dimensions make
 * the two questions independent, so asking both at once is an `AND` rather
 * than a contradiction.
 */
export async function getTransactions(filters?: TransactionFilterInput) {
  const conditions = monthConditions(filters);

  if (filters?.purposeId) {
    conditions.push(eq(transactions.purposeId, filters.purposeId));
  }
  if (filters?.fundingSourceId) {
    conditions.push(eq(transactions.fundingSourceId, filters.fundingSourceId));
  }

  return selectTransactions()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

/**
 * Monthly totals across an inclusive month range, as `{ month: "YYYY-MM" }`.
 *
 * Grouping on `substr(date, 1, 7)` works for the same reason the month filters
 * do: `date` is a fixed-width ISO string, so its first seven characters are the
 * month key and lexicographic comparison is chronological. Months with no
 * transactions are simply absent — callers zero-fill, since SQL has no row to
 * return for a month that never happened.
 */
export async function getTotalsByMonth(
  fromMonth: string,
  toMonth: string
): Promise<{ month: string; total: number }[]> {
  const monthExpr = sql<string>`substr(${transactions.date}, 1, 7)`;

  return db
    .select({
      month: monthExpr,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, `${fromMonth}-01`),
        lt(transactions.date, nextMonthStart(toMonth))
      )
    )
    .groupBy(monthExpr)
    .orderBy(monthExpr);
}

export type ShareLinkWithPurposes = ShareLink & {
  purposeIds: string[];
  purposeNames: string[];
};

/** All share links with their selected Purpose ids and names, for management. */
export async function getShareLinks(): Promise<ShareLinkWithPurposes[]> {
  const links = await db
    .select()
    .from(shareLinks)
    .orderBy(desc(shareLinks.createdAt));

  const rows = await db
    .select({
      shareLinkId: shareLinkPurposes.shareLinkId,
      purposeId: shareLinkPurposes.purposeId,
      purposeName: purposes.name,
    })
    .from(shareLinkPurposes)
    .innerJoin(purposes, eq(shareLinkPurposes.purposeId, purposes.id));

  return links.map((link) => {
    const own = rows.filter((r) => r.shareLinkId === link.id);
    return {
      ...link,
      purposeIds: own.map((r) => r.purposeId),
      purposeNames: own.map((r) => r.purposeName),
    };
  });
}

/** Enabled share link plus its Purpose ids, resolved from a public code. */
export async function getShareLinkByCode(
  code: string
): Promise<{ link: ShareLink; purposeIds: string[] } | null> {
  const [link] = await db
    .select()
    .from(shareLinks)
    .where(and(eq(shareLinks.code, code), eq(shareLinks.enabled, true)));

  if (!link) return null;

  const rows = await db
    .select({ purposeId: shareLinkPurposes.purposeId })
    .from(shareLinkPurposes)
    .where(eq(shareLinkPurposes.shareLinkId, link.id));

  return { link, purposeIds: rows.map((r) => r.purposeId) };
}

/** The view filters a share link's reader may apply within the link's scope. */
type ScopedFilters = {
  fromMonth?: string;
  toMonth?: string;
  /**
   * Narrows to one pot. Not scope (ADR-0002, amendment): the Purpose set is
   * the permission, and this only ever removes rows from it.
   */
  fundingSourceId?: string;
};

function purposeConditions(ids: string[], filters?: ScopedFilters) {
  const conditions = [
    inArray(transactions.purposeId, ids),
    ...monthConditions(filters),
  ];
  if (filters?.fundingSourceId) {
    conditions.push(eq(transactions.fundingSourceId, filters.fundingSourceId));
  }
  return conditions;
}

/**
 * Transactions across an explicit set of Purposes — from every Funding Source
 * unless the reader narrows to one.
 *
 * This is what a share link reads through. Scope is one-dimensional by
 * decision (ADR-0002): a link names Purposes, and its readers see the whole
 * Gross cost of each, however it was funded. The optional Funding Source
 * filter is the reader choosing what to look at within that, not the link
 * deciding what they may see.
 */
export async function getTransactionsForPurposes(
  ids: string[],
  filters?: ScopedFilters
) {
  if (ids.length === 0) return [];

  return selectTransactions()
    .where(and(...purposeConditions(ids, filters)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

/**
 * The distinct Funding Sources that paid for any of these Purposes, ever —
 * what a share link offers as its Funding Source filter. Derived from the
 * rows rather than the whole `funding_sources` table so a pot that never
 * touched a shared Purpose is not named to a reader.
 */
export async function getFundingSourcesForPurposes(
  ids: string[]
): Promise<{ id: string; name: string }[]> {
  if (ids.length === 0) return [];

  return db
    .selectDistinct({ id: fundingSources.id, name: fundingSources.name })
    .from(transactions)
    .innerJoin(
      fundingSources,
      eq(fundingSources.id, transactions.fundingSourceId)
    )
    .where(inArray(transactions.purposeId, ids))
    .orderBy(fundingSources.name);
}

export async function getTotalForPurposes(
  ids: string[],
  filters?: ScopedFilters
): Promise<number> {
  if (ids.length === 0) return 0;

  const [result] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(...purposeConditions(ids, filters)));

  return result?.total ?? 0;
}
