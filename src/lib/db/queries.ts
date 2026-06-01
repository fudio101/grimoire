import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { eq, and, gte, lt, desc, sql, inArray } from "drizzle-orm";
import { getDescendantIds } from "@/lib/category-tree";

export async function getCategories() {
  return db.select().from(categories).orderBy(categories.name);
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

export async function getCategoryByShareToken(token: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.shareToken, token), eq(categories.isPublic, true))
    );

  return category ?? null;
}

export async function getTransactionsByCategoryId(
  categoryId: string,
  filters?: { fromMonth?: string; toMonth?: string }
) {
  const subtreeIds = await getSubtreeCategoryIds(categoryId);
  const conditions = [inArray(transactions.categoryId, subtreeIds)];

  if (filters?.fromMonth) {
    conditions.push(gte(transactions.date, `${filters.fromMonth}-01`));
  }

  if (filters?.toMonth) {
    conditions.push(lt(transactions.date, nextMonthStart(filters.toMonth)));
  }

  return db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

export async function getCategoryTotal(
  categoryId: string,
  filters?: { fromMonth?: string; toMonth?: string }
): Promise<number> {
  const subtreeIds = await getSubtreeCategoryIds(categoryId);
  const conditions = [inArray(transactions.categoryId, subtreeIds)];

  if (filters?.fromMonth) {
    conditions.push(gte(transactions.date, `${filters.fromMonth}-01`));
  }

  if (filters?.toMonth) {
    conditions.push(lt(transactions.date, nextMonthStart(filters.toMonth)));
  }

  const [result] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(...conditions));

  return result?.total ?? 0;
}
