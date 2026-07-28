import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { shareLinkCategories, shareLinks } from "@/lib/db/schema";
import { shareLinkSchema } from "@/lib/schemas";
import { requireAdmin } from "@/server/auth.functions";
import { codeTaken, generateCode } from "@/server/share-links.server";
import type { ActionState } from "@/lib/types";

const NOT_FOUND = "Không tìm thấy liên kết.";
const CODE_TAKEN = "Mã này đã tồn tại.";

const idSchema = z.object({ id: z.string().min(1, "Thiếu mã liên kết.") });

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(shareLinkSchema)
  .handler(async ({ data }): Promise<ActionState> => {
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
  });

export const updateShareLink = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    z.object({
      id: z.string().min(1, "Thiếu mã liên kết."),
      data: shareLinkSchema,
    })
  )
  .handler(async ({ data: { id, data } }): Promise<ActionState> => {
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
  });

export const toggleShareLinkEnabled = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(idSchema)
  .handler(async ({ data: { id } }): Promise<ActionState> => {
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
  });

export const rotateShareLinkCode = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(idSchema)
  .handler(async ({ data: { id } }): Promise<ActionState> => {
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
  });

export const deleteShareLink = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(idSchema)
  .handler(async ({ data: { id } }): Promise<ActionState> => {
    db.transaction((tx) => {
      tx.delete(shareLinkCategories)
        .where(eq(shareLinkCategories.shareLinkId, id))
        .run();
      tx.delete(shareLinks).where(eq(shareLinks.id, id)).run();
    });

    return { success: true };
  });
