import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

/** A parent must be a leaf with no transactions of its own to take children. */
export async function parentCanAdoptChildren(
  parentId: string
): Promise<boolean> {
  const [tx] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.categoryId, parentId))
    .limit(1);
  return !tx;
}
