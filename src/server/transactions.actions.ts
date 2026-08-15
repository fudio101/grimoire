"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { transactionSchema, type TransactionInput } from "@/lib/schemas";
import { requireAuthForAction } from "@/server/auth-guard";
import { categoryIsLeaf } from "@/server/transactions.server";
import type { ActionState } from "@/lib/types";

const NOT_A_LEAF = "Vui lòng chọn danh mục cụ thể (không phải danh mục cha).";

export async function createTransaction(
  input: TransactionInput
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;

  const data = transactionSchema.parse(input);
  if (!(await categoryIsLeaf(data.categoryId))) {
    return { success: false, error: NOT_A_LEAF };
  }

  await db.insert(transactions).values(data);
  return { success: true };
}

export async function updateTransaction(
  id: string,
  input: TransactionInput
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  const data = transactionSchema.parse(input);
  if (!(await categoryIsLeaf(data.categoryId))) {
    return { success: false, error: NOT_A_LEAF };
  }

  await db.update(transactions).set(data).where(eq(transactions.id, id));
  return { success: true };
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  await db.delete(transactions).where(eq(transactions.id, id));
  return { success: true };
}
