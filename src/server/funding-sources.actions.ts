"use server";

import { z } from "zod";
import {
  fundingSourceSchema,
  type FundingSourceFormValues,
} from "@/lib/schemas";
import { requireAuthForAction } from "@/server/auth-guard";
import {
  FUNDING_SOURCE_DIMENSION,
  createDimension,
  deleteDimension,
  renameDimension,
} from "@/server/dimensions.server";
import type { ActionState } from "@/lib/types";

/**
 * The second dimension, managed entirely separately from Purposes so the two
 * cannot be confused with one another — the confusion this whole change exists
 * to remove. The mechanism behind these is shared (`dimensions.server.ts`); the
 * surface is not.
 */
export async function createFundingSource(
  input: FundingSourceFormValues
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;

  const data = fundingSourceSchema.parse(input);
  return createDimension(FUNDING_SOURCE_DIMENSION, data.name);
}

export async function updateFundingSource(
  id: string,
  input: FundingSourceFormValues
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  const data = fundingSourceSchema.parse(input);
  return renameDimension(FUNDING_SOURCE_DIMENSION, id, data.name);
}

export async function deleteFundingSource(id: string): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  return deleteDimension(FUNDING_SOURCE_DIMENSION, id);
}
