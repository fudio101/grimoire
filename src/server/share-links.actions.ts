"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { shareLinkCategories, shareLinks } from "@/lib/db/schema";
import { shareLinkSchema, type ShareLinkFormValues } from "@/lib/schemas";
import { requireAuthForAction } from "@/server/auth-guard";
import { codeTaken, generateCode } from "@/server/share-links.server";
import type { ActionState } from "@/lib/types";

const NOT_FOUND = "Không tìm thấy liên kết.";
const CODE_TAKEN = "Mã này đã tồn tại.";

export async function createShareLink(
  input: ShareLinkFormValues
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;

  const data = shareLinkSchema.parse(input);
  const code = data.code?.trim() ? data.code.trim() : generateCode();
  if (await codeTaken(code)) {
    return { success: false, error: CODE_TAKEN };
  }

  const name = data.name?.trim() || null;
  const { categoryIds } = data;

  db.transaction((tx) => {
    const [link] = tx
      .insert(shareLinks)
      .values({ code, name })
      .returning({ id: shareLinks.id })
      .all();
    tx.insert(shareLinkCategories)
      .values(
        categoryIds.map((categoryId) => ({
          shareLinkId: link.id,
          categoryId,
        }))
      )
      .run();
  });

  return { success: true };
}

export async function updateShareLink(
  id: string,
  input: ShareLinkFormValues
): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  const data = shareLinkSchema.parse(input);
  const [existing] = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.id, id))
    .limit(1);
  if (!existing) return { success: false, error: NOT_FOUND };

  const code = data.code?.trim() ? data.code.trim() : existing.code;
  if (code !== existing.code && (await codeTaken(code, id))) {
    return { success: false, error: CODE_TAKEN };
  }

  const name = data.name?.trim() || null;
  const { categoryIds } = data;

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

  return { success: true };
}

export async function toggleShareLinkEnabled(id: string): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  const [link] = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.id, id))
    .limit(1);
  if (!link) return { success: false, error: NOT_FOUND };

  await db
    .update(shareLinks)
    .set({ enabled: !link.enabled })
    .where(eq(shareLinks.id, id));

  return { success: true };
}

export async function rotateShareLinkCode(id: string): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  const [link] = await db
    .select({ id: shareLinks.id })
    .from(shareLinks)
    .where(eq(shareLinks.id, id))
    .limit(1);
  if (!link) return { success: false, error: NOT_FOUND };

  await db
    .update(shareLinks)
    .set({ code: generateCode() })
    .where(eq(shareLinks.id, id));

  return { success: true };
}

export async function deleteShareLink(id: string): Promise<ActionState> {
  const authError = await requireAuthForAction();
  if (authError) return authError;
  z.string().min(1).parse(id);

  db.transaction((tx) => {
    tx.delete(shareLinkCategories)
      .where(eq(shareLinkCategories.shareLinkId, id))
      .run();
    tx.delete(shareLinks).where(eq(shareLinks.id, id)).run();
  });

  return { success: true };
}
