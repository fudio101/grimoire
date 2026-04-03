import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { eq, and, gte, lt, desc, sql } from "drizzle-orm";

export async function getCategories() {
  return db.select().from(categories).orderBy(categories.name);
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
    conditions.push(eq(transactions.categoryId, filters.categoryId));
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
  const conditions = [eq(transactions.categoryId, categoryId)];

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
  const conditions = [eq(transactions.categoryId, categoryId)];

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
