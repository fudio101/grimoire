import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { categorySchema } from "@/lib/schemas";
import { getDescendantIds } from "@/lib/category-tree";
import { requireAdmin } from "@/server/auth.functions";
import { parentCanAdoptChildren } from "@/server/categories.server";
import type { ActionState } from "@/lib/types";

const PARENT_NOT_FOUND = "Không tìm thấy danh mục cha.";
const PARENT_HAS_TRANSACTIONS =
  "Danh mục cha đã có giao dịch, không thể thêm danh mục con.";
const PARENT_IS_DESCENDANT = "Không thể chọn danh mục con làm danh mục cha.";

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(categorySchema)
  .handler(async ({ data }): Promise<ActionState> => {
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
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    z.object({
      id: z.string().min(1, "Thiếu mã danh mục."),
      data: categorySchema,
    })
  )
  .handler(async ({ data: { id, data } }): Promise<ActionState> => {
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
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(z.object({ id: z.string().min(1, "Thiếu mã danh mục.") }))
  .handler(async ({ data: { id } }): Promise<ActionState> => {
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
  });
