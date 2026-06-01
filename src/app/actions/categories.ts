"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { categorySchema, type CategoryInput } from "@/lib/schemas";
import { getDescendantIds } from "@/lib/category-tree";
import type { ActionState } from "@/lib/types";

/** A parent must be a leaf with no transactions of its own to take children. */
async function parentCanAdoptChildren(parentId: string): Promise<boolean> {
  const [tx] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.categoryId, parentId))
    .limit(1);
  return !tx;
}

export async function createCategory(
  data: CategoryInput
): Promise<ActionState> {
  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const parentId = parsed.data.parentId ?? null;

  if (parentId) {
    const [parent] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, parentId))
      .limit(1);
    if (!parent) {
      return { success: false, error: "Không tìm thấy danh mục cha." };
    }
    if (!(await parentCanAdoptChildren(parentId))) {
      return {
        success: false,
        error: "Danh mục cha đã có giao dịch, không thể thêm danh mục con.",
      };
    }
  }

  await db.insert(categories).values({ name: parsed.data.name, parentId });
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard");
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

  const parentId = parsed.data.parentId ?? null;

  if (parentId) {
    if (parentId === id) {
      return {
        success: false,
        error: "Không thể chọn danh mục con làm danh mục cha.",
      };
    }

    const all = await db
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories);

    if (!all.some((c) => c.id === parentId)) {
      return { success: false, error: "Không tìm thấy danh mục cha." };
    }
    if (getDescendantIds(id, all).includes(parentId)) {
      return {
        success: false,
        error: "Không thể chọn danh mục con làm danh mục cha.",
      };
    }
    if (!(await parentCanAdoptChildren(parentId))) {
      return {
        success: false,
        error: "Danh mục cha đã có giao dịch, không thể thêm danh mục con.",
      };
    }
  }

  await db
    .update(categories)
    .set({ name: parsed.data.name, parentId })
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

export async function rotateShareToken(
  categoryId: string
): Promise<ActionState> {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId));

  if (!category) return { success: false, error: "Không tìm thấy danh mục." };
  if (!category.isPublic)
    return { success: false, error: "Danh mục chưa công khai." };

  await db
    .update(categories)
    .set({ shareToken: nanoid(12) })
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

  // Orphan any children up to root level, then delete, atomically.
  db.transaction((tx) => {
    tx.update(categories)
      .set({ parentId: null })
      .where(eq(categories.parentId, categoryId))
      .run();
    tx.delete(categories).where(eq(categories.id, categoryId)).run();
  });

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard");
  return { success: true };
}
