import "server-only";
import { eq } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  fundingSources,
  purposes,
  shareLinkPurposes,
  transactions,
} from "@/lib/db/schema";
import type { ActionState } from "@/lib/types";

/**
 * Purposes and Funding Sources are independent tables with identical shape: an
 * id, a name, and the rule that neither can be removed while transactions
 * still point at it. The rule is written once here and the two `*.actions.ts`
 * files stay thin wrappers, so the guard cannot drift between the dimensions —
 * which is the way a check like this usually rots.
 *
 * They keep separate public surfaces on purpose (ADR-0001: the two dimensions
 * must not be confusable with one another); what is shared is the mechanism,
 * not the vocabulary. Every user-facing string comes from the `labels` below.
 */
export type Dimension = {
  table: typeof purposes | typeof fundingSources;
  /** The `transactions` column that references this dimension. */
  reference: SQLiteColumn;
  labels: { notFound: string; inUse: string };
  /**
   * Rows outside `transactions` that reference this dimension and should go
   * with it on delete, run inside the same transaction as the delete itself.
   * Only Purposes have any: they are what a share link's scope is made of.
   */
  detach?: (id: string) => void;
};

export const PURPOSE_DIMENSION: Dimension = {
  table: purposes,
  reference: transactions.purposeId,
  labels: {
    notFound: "Không tìm thấy mục đích chi.",
    inUse: "Không thể xoá mục đích chi đã có giao dịch.",
  },
  // A Purpose can sit in a share link's scope with no transactions of its own.
  // Removing it narrows that link rather than blocking the delete: the scope is
  // a list of what to show, and a Purpose that no longer exists shows nothing.
  detach: (id) =>
    db
      .delete(shareLinkPurposes)
      .where(eq(shareLinkPurposes.purposeId, id))
      .run(),
};

export const FUNDING_SOURCE_DIMENSION: Dimension = {
  table: fundingSources,
  labels: {
    notFound: "Không tìm thấy nguồn tiền.",
    inUse: "Không thể xoá nguồn tiền đã có giao dịch.",
  },
  reference: transactions.fundingSourceId,
};

export async function dimensionExists(
  dimension: Dimension,
  id: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: dimension.table.id })
    .from(dimension.table)
    .where(eq(dimension.table.id, id))
    .limit(1);
  return Boolean(row);
}

async function hasTransactions(
  dimension: Dimension,
  id: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(dimension.reference, id))
    .limit(1);
  return Boolean(row);
}

export async function createDimension(
  dimension: Dimension,
  name: string
): Promise<ActionState> {
  await db.insert(dimension.table).values({ name });
  return { success: true };
}

export async function renameDimension(
  dimension: Dimension,
  id: string,
  name: string
): Promise<ActionState> {
  if (!(await dimensionExists(dimension, id))) {
    return { success: false, error: dimension.labels.notFound };
  }

  await db
    .update(dimension.table)
    .set({ name })
    .where(eq(dimension.table.id, id));
  return { success: true };
}

/**
 * Refused while anything still points here, so history cannot be orphaned.
 *
 * There is no cascade and no "move the transactions somewhere else" step: both
 * foreign keys are `NOT NULL`, so the only alternatives to refusing are
 * deleting the admin's transactions or silently reassigning them, and neither
 * is a thing a delete button should do without being asked.
 */
export async function deleteDimension(
  dimension: Dimension,
  id: string
): Promise<ActionState> {
  // Checked rather than treated as a no-op success, to match `renameDimension`
  // — and because the two dimensions are separate tables, so an id from the
  // wrong one is a real mistake that should say so instead of reporting that
  // it deleted something.
  if (!(await dimensionExists(dimension, id))) {
    return { success: false, error: dimension.labels.notFound };
  }
  if (await hasTransactions(dimension, id)) {
    return { success: false, error: dimension.labels.inUse };
  }

  // Atomic: a detach that succeeded next to a delete that failed would leave a
  // share link quietly missing a Purpose it still has every right to show.
  db.transaction(() => {
    dimension.detach?.(id);
    db.delete(dimension.table).where(eq(dimension.table.id, id)).run();
  });
  return { success: true };
}
