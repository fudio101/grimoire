"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { categorySchema, type CategoryFormValues } from "@/lib/schemas";
import { getDescendantIds } from "@/lib/category-tree";
import { requireAuthForAction } from "@/server/auth-guard";
import { parentCanAdoptChildren } from "@/server/categories.server";
import type { ActionState } from "@/lib/types";

const PARENT_NOT_FOUND = "Không tìm thấy danh mục cha.";
const PARENT_HAS_TRANSACTIONS =
  "Danh mục cha đã có giao dịch, không thể thêm danh mục con.";
const PARENT_IS_DESCENDANT = "Không thể chọn danh mục con làm danh mục cha.";

export async function createCategory(
  input: CategoryFormValues
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;

  // Re-parsed rather than trusted: TanStack Form already validated this
  // client-side, but the exported function is a public endpoint any client
  // can call directly.
  const data = categorySchema.parse(input);
  const parentId = data.parentId ?? null;

  if (parentId) {
    const [parent] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, parentId))
      .limit(1);
    if (!parent) return { success: false, error: PARENT_NOT_FOUND };
    if (!(await parentCanAdoptChildren(parentId))) {
      return { success: false, error: PARENT_HAS_TRANSACTIONS };
    }
  }

  await db.insert(categories).values({ name: data.name, parentId });
  return { success: true };
}

export async function updateCategory(
  id: string,
  input: CategoryFormValues
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  const data = categorySchema.parse(input);
  const parentId = data.parentId ?? null;

  if (parentId) {
    if (parentId === id) {
      return { success: false, error: PARENT_IS_DESCENDANT };
    }

    const all = await db
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories);

    if (!all.some((c) => c.id === parentId)) {
      return { success: false, error: PARENT_NOT_FOUND };
    }
    if (getDescendantIds(id, all).includes(parentId)) {
      return { success: false, error: PARENT_IS_DESCENDANT };
    }
    if (!(await parentCanAdoptChildren(parentId))) {
      return { success: false, error: PARENT_HAS_TRANSACTIONS };
    }
  }

  await db
    .update(categories)
    .set({ name: data.name, parentId })
    .where(eq(categories.id, id));

  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  const related = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.categoryId, id))
    .limit(1);

  if (related.length > 0) {
    return {
      success: false,
      error: "Không thể xoá danh mục đã có giao dịch.",
    };
  }

  // Orphan any children up to root level, then delete, atomically.
  db.transaction((tx) => {
    tx.update(categories)
      .set({ parentId: null })
      .where(eq(categories.parentId, id))
      .run();
    tx.delete(categories).where(eq(categories.id, id)).run();
  });

  return { success: true };
}
