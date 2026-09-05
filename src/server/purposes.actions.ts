"use server";

import { z } from "zod";
import { purposeSchema, type PurposeFormValues } from "@/lib/schemas";
import { requireAuthForAction } from "@/server/auth-guard";
import {
  PURPOSE_DIMENSION,
  createDimension,
  deleteDimension,
  renameDimension,
} from "@/server/dimensions.server";
import type { ActionState } from "@/lib/types";

/**
 * Purposes are a flat list: create, rename, delete. There is no parent to
 * choose, no leaf rule, and no "this one already has transactions so it cannot
 * take children" — all three existed only to prop up the hierarchy and went
 * with it (ADR-0001).
 */
export async function createPurpose(
  input: PurposeFormValues
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;

  // Re-parsed rather than trusted: TanStack Form already validated this
  // client-side, but the exported function is a public endpoint any client
  // can call directly.
  const data = purposeSchema.parse(input);
  return createDimension(PURPOSE_DIMENSION, data.name);
}

export async function updatePurpose(
  id: string,
  input: PurposeFormValues
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  const data = purposeSchema.parse(input);
  return renameDimension(PURPOSE_DIMENSION, id, data.name);
}

export async function deletePurpose(id: string): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  return deleteDimension(PURPOSE_DIMENSION, id);
}
