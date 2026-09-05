import "server-only";
import { and, eq, ne } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";

/** The handle `db.transaction` hands its callback. */
type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
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
  labels: { notFound: string; inUse: string; nameTaken: string };
  /**
   * Rows outside `transactions` that reference this dimension and should go
   * with it on delete. Handed the transaction handle so its writes are
   * genuinely inside the same transaction as the delete, rather than landing
   * there only because better-sqlite3 happens to be one synchronous
   * connection. Only Purposes have any: they are what a share link's scope is
   * made of.
   */
  detach?: (tx: DrizzleTransaction, id: string) => void;
};

export const PURPOSE_DIMENSION: Dimension = {
  table: purposes,
  reference: transactions.purposeId,
  labels: {
    notFound: "Không tìm thấy mục đích chi.",
    inUse: "Không thể xoá mục đích chi đã có giao dịch.",
    nameTaken: "Đã có mục đích chi tên này.",
  },
  // A Purpose can sit in a share link's scope with no transactions of its own.
  // Removing it narrows that link rather than blocking the delete: the scope is
  // a list of what to show, and a Purpose that no longer exists shows nothing.
  detach: (tx, id) =>
    tx
      .delete(shareLinkPurposes)
      .where(eq(shareLinkPurposes.purposeId, id))
      .run(),
};

export const FUNDING_SOURCE_DIMENSION: Dimension = {
  table: fundingSources,
  labels: {
    notFound: "Không tìm thấy nguồn tiền.",
    inUse: "Không thể xoá nguồn tiền đã có giao dịch.",
    nameTaken: "Đã có nguồn tiền tên này.",
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

/**
 * Whether another row of this dimension already carries `name`.
 *
 * `schema.ts` deliberately ships no unique index — it would hand the migration
 * a way to fail on real data — and says the rule belongs here instead, as a
 * checked rule with a message. This is that rule. Without it the same name can
 * exist twice, and nothing on screen can tell the two apart now that the
 * breadcrumb which used to disambiguate same-named leaves went with the tree.
 */
function nameTaken(
  tx: DrizzleTransaction,
  dimension: Dimension,
  name: string,
  exceptId?: string
): boolean {
  const conditions = [eq(dimension.table.name, name)];
  if (exceptId) conditions.push(ne(dimension.table.id, exceptId));
  const [row] = tx
    .select({ id: dimension.table.id })
    .from(dimension.table)
    .where(and(...conditions))
    .limit(1)
    .all();
  return Boolean(row);
}

function exists(
  tx: DrizzleTransaction,
  dimension: Dimension,
  id: string
): boolean {
  const [row] = tx
    .select({ id: dimension.table.id })
    .from(dimension.table)
    .where(eq(dimension.table.id, id))
    .limit(1)
    .all();
  return Boolean(row);
}

function hasTransactions(
  tx: DrizzleTransaction,
  dimension: Dimension,
  id: string
): boolean {
  const [row] = tx
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(dimension.reference, id))
    .limit(1)
    .all();
  return Boolean(row);
}

/**
 * Every guard below runs *inside* the transaction that acts on it.
 *
 * Read outside it, each would be a time-of-check/time-of-use window: two tabs,
 * or the mobile form retrying, is all it takes for a transaction to be inserted
 * between "this Purpose has none" and the delete — and the loser gets a raw
 * `FOREIGN KEY constraint failed` thrown across the action boundary instead of
 * the sentence in `labels`. better-sqlite3 is synchronous, so closing the
 * window costs nothing: the whole check-and-act is one uninterrupted callback.
 */
export async function createDimension(
  dimension: Dimension,
  name: string
): Promise<ActionState> {
  return db.transaction((tx) => {
    if (nameTaken(tx, dimension, name)) {
      return { success: false, error: dimension.labels.nameTaken };
    }
    tx.insert(dimension.table).values({ name }).run();
    return { success: true };
  });
}

export async function renameDimension(
  dimension: Dimension,
  id: string,
  name: string
): Promise<ActionState> {
  return db.transaction((tx) => {
    if (!exists(tx, dimension, id)) {
      return { success: false, error: dimension.labels.notFound };
    }
    // Excluding itself, so re-saving an unchanged name is not a collision.
    if (nameTaken(tx, dimension, name, id)) {
      return { success: false, error: dimension.labels.nameTaken };
    }
    tx.update(dimension.table)
      .set({ name })
      .where(eq(dimension.table.id, id))
      .run();
    return { success: true };
  });
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
  return db.transaction((tx) => {
    // Checked rather than treated as a no-op success, to match
    // `renameDimension` — and because the two dimensions are separate tables,
    // so an id from the wrong one is a real mistake that should say so instead
    // of reporting that it deleted something.
    if (!exists(tx, dimension, id)) {
      return { success: false, error: dimension.labels.notFound };
    }
    if (hasTransactions(tx, dimension, id)) {
      return { success: false, error: dimension.labels.inUse };
    }

    // Atomic with the guards above, and with each other: a detach that
    // succeeded next to a delete that failed would leave a share link quietly
    // missing a Purpose it still has every right to show.
    dimension.detach?.(tx, id);
    tx.delete(dimension.table).where(eq(dimension.table.id, id)).run();
    return { success: true };
  });
}
