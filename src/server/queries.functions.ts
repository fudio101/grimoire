import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCategories,
  getShareLinks,
  getTransactions,
} from "@/lib/db/queries";
import { requireAdmin } from "@/server/auth.functions";

export const transactionFilterSchema = z.object({
  fromMonth: z.string().optional(),
  toMonth: z.string().optional(),
  category: z.string().optional(),
});

export type TransactionFilters = z.infer<typeof transactionFilterSchema>;

export const fetchCategories = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => getCategories());

export const fetchTransactions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator(transactionFilterSchema)
  .handler(async ({ data }) =>
    getTransactions({
      fromMonth: data.fromMonth,
      toMonth: data.toMonth,
      categoryId: data.category,
    })
  );

export const fetchShareLinks = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => getShareLinks());
