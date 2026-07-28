import "@tanstack/react-start/server-only";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { isLeaf } from "@/lib/category-tree";

/** Transactions may only sit on leaf categories (those without children). */
export async function categoryIsLeaf(categoryId: string): Promise<boolean> {
  const all = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories);
  return isLeaf(categoryId, all);
}
