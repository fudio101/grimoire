"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { transactionSchema, type TransactionInput } from "@/lib/schemas";
import type { ActionState } from "@/lib/types";

export async function createTransaction(
  data: TransactionInput
): Promise<ActionState> {
  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
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
