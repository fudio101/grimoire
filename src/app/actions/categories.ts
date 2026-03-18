"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { categorySchema, type CategoryInput } from "@/lib/schemas";
import type { ActionState } from "@/lib/types";

export async function createCategory(
  data: CategoryInput
): Promise<ActionState> {
  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await db.insert(categories).values({ name: parsed.data.name });
  revalidatePath("/dashboard/categories");
  return { success: true };
}

export async function updateCategory(
  id: string,
  data: CategoryInput
): Promise<ActionState> {
  if (!id) return { success: false, error: "Thiếu mã danh mục." };

  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await db
    .update(categories)
    .set({ name: parsed.data.name })
    .where(eq(categories.id, id));

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleCategoryPublic(
  categoryId: string
): Promise<ActionState> {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId));

  if (!category) return { success: false, error: "Không tìm thấy danh mục." };

  const newIsPublic = !category.isPublic;
  await db
    .update(categories)
    .set({
      isPublic: newIsPublic,
      shareToken: newIsPublic ? nanoid(12) : null,
    })
    .where(eq(categories.id, categoryId));

  revalidatePath("/dashboard/categories");
  return { success: true };
}

export async function deleteCategory(categoryId: string): Promise<ActionState> {
  const relatedTransactions = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId))
    .limit(1);

  if (relatedTransactions.length > 0) {
    return {
      success: false,
      error: "Không thể xoá danh mục đã có giao dịch.",
    };
  }

  await db.delete(categories).where(eq(categories.id, categoryId));
  revalidatePath("/dashboard/categories");
  return { success: true };
}
