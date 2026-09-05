"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { transactionSchema, type TransactionInput } from "@/lib/schemas";
import { requireAuthForAction } from "@/server/auth-guard";
import {
  FUNDING_SOURCE_DIMENSION,
  PURPOSE_DIMENSION,
  dimensionExists,
} from "@/server/dimensions.server";
import type { ActionState } from "@/lib/types";

/**
 * Both dimensions must name something that exists.
 *
 * This is the whole validation now. The rule that a transaction could only
 * attach to a *leaf* is gone with the hierarchy (ADR-0001): every Purpose is
 * attachable, which is the point — the tree's leaf level was the Purpose
 * dimension all along, and its non-leaf level was the Funding Source.
 *
 * Checked here rather than left to the foreign keys so the caller gets an
 * `ActionState` with a sentence in it instead of a raw SQLite throw.
 */
async function validateDimensions(
  data: TransactionInput
): Promise<ActionState | null> {
  if (!(await dimensionExists(PURPOSE_DIMENSION, data.purposeId))) {
    return { success: false, error: PURPOSE_DIMENSION.labels.notFound };
  }
  if (
    !(await dimensionExists(FUNDING_SOURCE_DIMENSION, data.fundingSourceId))
  ) {
    return { success: false, error: FUNDING_SOURCE_DIMENSION.labels.notFound };
  }
  return null;
}

export async function createTransaction(
  input: TransactionInput
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;

  const data = transactionSchema.parse(input);
  const invalid = await validateDimensions(data);
  if (invalid) return invalid;

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
  const invalid = await validateDimensions(data);
  if (invalid) return invalid;

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
