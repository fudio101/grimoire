import "server-only";
import { customAlphabet } from "nanoid";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, shareLinks } from "@/lib/db/schema";

// Lowercase alphanumeric only, so generated codes satisfy the shareLinkSchema
// `code` pattern and survive an unchanged edit round-trip.
export const generateCode = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  12
);

export async function codeTaken(
  code: string,
  exceptId?: string
): Promise<boolean> {
  const conditions = [eq(shareLinks.code, code)];
  if (exceptId) conditions.push(ne(shareLinks.id, exceptId));
  const [row] = await db
    .select({ id: shareLinks.id })
    .from(shareLinks)
    .where(and(...conditions))
    .limit(1);
  return Boolean(row);
}

/** Existence check for a share link's `categoryIds`, ahead of the FK throw. */
export async function allCategoriesExist(
  categoryIds: string[]
): Promise<boolean> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.id, categoryIds));
  return rows.length === new Set(categoryIds).size;
}
