import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { transactionSchema } from "@/lib/schemas";
import { requireAdmin } from "@/server/auth.functions";
import { categoryIsLeaf } from "@/server/transactions.server";
import type { ActionState } from "@/lib/types";

const NOT_A_LEAF = "Vui lòng chọn danh mục cụ thể (không phải danh mục cha).";

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(transactionSchema)
  .handler(async ({ data }): Promise<ActionState> => {
    if (!(await categoryIsLeaf(data.categoryId))) {
      return { success: false, error: NOT_A_LEAF };
    }

    await db.insert(transactions).values(data);
    return { success: true };
  });

export const updateTransaction = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    z.object({
      id: z.string().min(1, "Thiếu mã giao dịch."),
      data: transactionSchema,
    })
  )
  .handler(async ({ data: { id, data } }): Promise<ActionState> => {
    if (!(await categoryIsLeaf(data.categoryId))) {
      return { success: false, error: NOT_A_LEAF };
    }

    await db.update(transactions).set(data).where(eq(transactions.id, id));
    return { success: true };
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(z.object({ id: z.string().min(1, "Thiếu mã giao dịch.") }))
  .handler(async ({ data: { id } }): Promise<ActionState> => {
    await db.delete(transactions).where(eq(transactions.id, id));
    return { success: true };
  });
