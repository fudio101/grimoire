"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { transactionSchema, type TransactionInput } from "@/lib/schemas";
import { isLeaf } from "@/lib/category-tree";
import type { ActionState } from "@/lib/types";

/** Transactions may only sit on leaf categories (those without children). */
async function categoryIsLeaf(categoryId: string): Promise<boolean> {
  const all = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories);
  return isLeaf(categoryId, all);
}

export async function createTransaction(
  data: TransactionInput
): Promise<ActionState> {
  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  if (!(await categoryIsLeaf(parsed.data.categoryId))) {
    return {
      success: false,
      error: "Vui lòng chọn danh mục cụ thể (không phải danh mục cha).",
    };
  }

  await db.insert(transactions).values(parsed.data);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateTransaction(
  id: string,
  data: TransactionInput
): Promise<ActionState> {
  if (!id) return { success: false, error: "Thiếu mã giao dịch." };

  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  if (!(await categoryIsLeaf(parsed.data.categoryId))) {
    return {
      success: false,
      error: "Vui lòng chọn danh mục cụ thể (không phải danh mục cha).",
    };
  }

  await db.update(transactions).set(parsed.data).where(eq(transactions.id, id));

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTransaction(
  transactionId: string
): Promise<ActionState> {
  await db.delete(transactions).where(eq(transactions.id, transactionId));
  revalidatePath("/dashboard");
  return { success: true };
}
