import "@tanstack/react-start/server-only";
import { db } from "@/lib/db";
import {
  categories,
  transactions,
  shareLinks,
  shareLinkCategories,
} from "@/lib/db/schema";
import { eq, and, gte, lt, desc, sql, inArray } from "drizzle-orm";
import { getDescendantIds } from "@/lib/category-tree";
import type { ShareLink } from "@/lib/db/schema";

export async function getCategories() {
  return db.select().from(categories).orderBy(categories.name);
}

/** Expose subtree expansion for callers that resolve a picked category id. */
export async function expandCategorySubtree(rootId: string): Promise<string[]> {
  return getSubtreeCategoryIds(rootId);
}

/**
 * Expand a category id to itself plus all descendants. Transactions only ever
 * sit on leaf categories, so filtering by a parent rolls up the whole subtree.
 */
async function getSubtreeCategoryIds(rootId: string): Promise<string[]> {
  const all = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories);
  return [rootId, ...getDescendantIds(rootId, all)];
}

function nextMonthStart(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  return `${nextYear}-${String(nextMon).padStart(2, "0")}-01`;
}

export async function getTransactions(filters?: {
  fromMonth?: string;
  toMonth?: string;
  categoryId?: string;
}) {
  const conditions = [];

  if (filters?.categoryId) {
    const subtreeIds = await getSubtreeCategoryIds(filters.categoryId);
    conditions.push(inArray(transactions.categoryId, subtreeIds));
  }

  if (filters?.fromMonth) {
    conditions.push(gte(transactions.date, `${filters.fromMonth}-01`));
  }

  if (filters?.toMonth) {
    conditions.push(lt(transactions.date, nextMonthStart(filters.toMonth)));
  }

  const rows = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      note: transactions.note,
      date: transactions.date,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  return rows;
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

/**
 * The categories used most in recent history, for the quick-pick chips.
 *
 * Ranked by frequency first and recency second: the point is to surface the
 * handful of categories that cover most entries, so one tap replaces opening
 * the picker at all. Restricted to a trailing window so a category used heavily
 * a year ago and abandoned since does not hold a slot forever.
 */
export async function getRecentCategories(
  limit = 8,
  windowDays = 90
): Promise<{ id: string; name: string }[]> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return db
    .select({ id: categories.id, name: categories.name })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(gte(transactions.date, since))
    .groupBy(categories.id, categories.name)
    .orderBy(desc(sql`count(*)`), desc(sql`max(${transactions.date})`))
    .limit(limit);
}

export type ShareLinkWithCategories = ShareLink & {
  categoryIds: string[];
  categoryNames: string[];
};

/** All share links with their selected category ids and names, for management. */
export async function getShareLinks(): Promise<ShareLinkWithCategories[]> {
  const links = await db
    .select()
    .from(shareLinks)
    .orderBy(desc(shareLinks.createdAt));

  const rows = await db
    .select({
      shareLinkId: shareLinkCategories.shareLinkId,
      categoryId: shareLinkCategories.categoryId,
      categoryName: categories.name,
    })
    .from(shareLinkCategories)
    .leftJoin(categories, eq(shareLinkCategories.categoryId, categories.id));

  return links.map((link) => {
    const own = rows.filter((r) => r.shareLinkId === link.id);
    return {
      ...link,
      categoryIds: own.map((r) => r.categoryId),
      categoryNames: own.map((r) => r.categoryName ?? "—"),
    };
  });
}

/** Enabled share link plus its category ids, resolved from a public code. */
export async function getShareLinkByCode(
  code: string
): Promise<{ link: ShareLink; categoryIds: string[] } | null> {
  const [link] = await db
    .select()
    .from(shareLinks)
    .where(and(eq(shareLinks.code, code), eq(shareLinks.enabled, true)));

  if (!link) return null;

  const rows = await db
    .select({ categoryId: shareLinkCategories.categoryId })
    .from(shareLinkCategories)
    .where(eq(shareLinkCategories.shareLinkId, link.id));

  return { link, categoryIds: rows.map((r) => r.categoryId) };
}

function monthConditions(
  ids: string[],
  filters?: { fromMonth?: string; toMonth?: string }
) {
  const conditions = [inArray(transactions.categoryId, ids)];
  if (filters?.fromMonth) {
    conditions.push(gte(transactions.date, `${filters.fromMonth}-01`));
  }
  if (filters?.toMonth) {
    conditions.push(lt(transactions.date, nextMonthStart(filters.toMonth)));
  }
  return conditions;
}

/** Transactions across an explicit set of category ids, with category names. */
export async function getTransactionsForCategories(
  ids: string[],
  filters?: { fromMonth?: string; toMonth?: string }
) {
  if (ids.length === 0) return [];

  return db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      note: transactions.note,
      date: transactions.date,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...monthConditions(ids, filters)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

export async function getTotalForCategories(
  ids: string[],
  filters?: { fromMonth?: string; toMonth?: string }
): Promise<number> {
  if (ids.length === 0) return 0;

  const [result] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(...monthConditions(ids, filters)));

  return result?.total ?? 0;
}
