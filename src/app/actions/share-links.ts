"use server";

import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { shareLinks, shareLinkCategories } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { shareLinkSchema, type ShareLinkInput } from "@/lib/schemas";
import type { ActionState } from "@/lib/types";

// Lowercase alphanumeric only, so generated codes satisfy the shareLinkSchema
// `code` pattern (^[a-z0-9-]{3,32}$) and survive an unchanged edit round-trip.
const generateCode = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

async function codeTaken(code: string, exceptId?: string): Promise<boolean> {
  const conditions = [eq(shareLinks.code, code)];
  if (exceptId) conditions.push(ne(shareLinks.id, exceptId));
  const [row] = await db
    .select({ id: shareLinks.id })
    .from(shareLinks)
    .where(and(...conditions))
    .limit(1);
  return Boolean(row);
}

export async function createShareLink(
  data: ShareLinkInput
): Promise<ActionState> {
  const parsed = shareLinkSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const code = parsed.data.code?.trim()
    ? parsed.data.code.trim()
    : generateCode();
  if (await codeTaken(code)) {
    return { success: false, error: "Mã này đã tồn tại." };
  }

  const name = parsed.data.name?.trim() || null;
  const categoryIds = parsed.data.categoryIds;

  db.transaction((tx) => {
    const [link] = tx
      .insert(shareLinks)
      .values({ code, name })
      .returning({ id: shareLinks.id })
      .all();
    tx.insert(shareLinkCategories)
      .values(
        categoryIds.map((categoryId) => ({ shareLinkId: link.id, categoryId }))
      )
      .run();
  });

  revalidatePath("/dashboard/links");
  return { success: true };
}

export async function updateShareLink(
  id: string,
  data: ShareLinkInput
): Promise<ActionState> {
  if (!id) return { success: false, error: "Thiếu mã liên kết." };

  const parsed = shareLinkSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const [existing] = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.id, id))
    .limit(1);
  if (!existing) return { success: false, error: "Không tìm thấy liên kết." };

  const code = parsed.data.code?.trim()
    ? parsed.data.code.trim()
    : existing.code;
  if (code !== existing.code && (await codeTaken(code, id))) {
    return { success: false, error: "Mã này đã tồn tại." };
  }

  const name = parsed.data.name?.trim() || null;
  const categoryIds = parsed.data.categoryIds;

  db.transaction((tx) => {
    tx.update(shareLinks)
      .set({ code, name })
      .where(eq(shareLinks.id, id))
      .run();
    tx.delete(shareLinkCategories)
      .where(eq(shareLinkCategories.shareLinkId, id))
      .run();
    tx.insert(shareLinkCategories)
      .values(
        categoryIds.map((categoryId) => ({ shareLinkId: id, categoryId }))
      )
      .run();
  });

  revalidatePath("/dashboard/links");
  return { success: true };
}

export async function toggleShareLinkEnabled(id: string): Promise<ActionState> {
  const [link] = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.id, id))
    .limit(1);
  if (!link) return { success: false, error: "Không tìm thấy liên kết." };

  await db
    .update(shareLinks)
    .set({ enabled: !link.enabled })
    .where(eq(shareLinks.id, id));

  revalidatePath("/dashboard/links");
  return { success: true };
}

export async function rotateShareLinkCode(id: string): Promise<ActionState> {
  const [link] = await db
    .select({ id: shareLinks.id })
    .from(shareLinks)
    .where(eq(shareLinks.id, id))
    .limit(1);
  if (!link) return { success: false, error: "Không tìm thấy liên kết." };

  await db
    .update(shareLinks)
    .set({ code: generateCode() })
    .where(eq(shareLinks.id, id));

  revalidatePath("/dashboard/links");
  return { success: true };
}

export async function deleteShareLink(id: string): Promise<ActionState> {
  db.transaction((tx) => {
    tx.delete(shareLinkCategories)
      .where(eq(shareLinkCategories.shareLinkId, id))
      .run();
    tx.delete(shareLinks).where(eq(shareLinks.id, id)).run();
  });

  revalidatePath("/dashboard/links");
  return { success: true };
}
