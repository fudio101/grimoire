import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

/**
 * Transactions may only sit on leaf categories (those without children).
 *
 * Asked as "does any category name this one as its parent", which is what leaf
 * means. This used to pull the whole category table across and run the shared
 * `isLeaf` helper over it in JS, on every transaction create and update — the
 * helper is the right tool when the caller already holds the list, and the
 * wrong one when the answer is a single row.
 */
export async function categoryIsLeaf(categoryId: string): Promise<boolean> {
  const [child] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, categoryId))
    .limit(1);
  return !child;
}

/**
 * `categoryIsLeaf` answers "does anything name this as its parent", which is
 * true for a nonexistent id too — this is the separate existence check that
 * catches that case with a friendly `ActionState` error instead of an FK throw.
 */
export async function categoryExists(categoryId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  return Boolean(row);
}
