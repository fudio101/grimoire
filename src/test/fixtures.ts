import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";

/**
 * The smallest category tree that reproduces the shape the production data
 * actually has: two roots that are really funding pots, and leaves that are
 * really spending purposes — with the *same* purpose name occurring under each
 * root, which is the collision that motivates the two-dimension rework.
 *
 * ```
 * Nguồn A (root-a)            Nguồn B (root-b)
 * ├─ Mục X (leaf-ax)          └─ Mục X (leaf-bx)   ← same name, different branch
 * └─ Mục Y (leaf-ay)
 * ```
 *
 * Every name, amount and date below is invented for this test. Nothing here is
 * derived from the production snapshot — this repository is public.
 */
export const CATEGORY_IDS = {
  rootA: "root-a",
  leafAX: "leaf-ax",
  leafAY: "leaf-ay",
  rootB: "root-b",
  leafBX: "leaf-bx",
} as const;

/**
 * Amounts are distinct powers-of-eleven multiples so that any total identifies
 * exactly which rows produced it — a wrong subset cannot coincidentally sum to
 * the right figure.
 */
export const TXN = {
  janAX: { id: "txn-jan-ax", amount: 11000, date: "2026-01-10T09:00" },
  febAX: { id: "txn-feb-ax", amount: 22000, date: "2026-02-11T09:00" },
  febBX: { id: "txn-feb-bx", amount: 33000, date: "2026-02-12T09:00" },
  febAY: { id: "txn-feb-ay", amount: 44000, date: "2026-02-13T09:00" },
  marAX: { id: "txn-mar-ax", amount: 55000, date: "2026-03-14T09:00" },
} as const;

export async function seedTwoBranchTree(): Promise<void> {
  await db.insert(categories).values([
    { id: CATEGORY_IDS.rootA, name: "Nguồn A", parentId: null },
    { id: CATEGORY_IDS.leafAX, name: "Mục X", parentId: CATEGORY_IDS.rootA },
    { id: CATEGORY_IDS.leafAY, name: "Mục Y", parentId: CATEGORY_IDS.rootA },
    { id: CATEGORY_IDS.rootB, name: "Nguồn B", parentId: null },
    { id: CATEGORY_IDS.leafBX, name: "Mục X", parentId: CATEGORY_IDS.rootB },
  ]);

  await db.insert(transactions).values([
    { ...TXN.janAX, note: "", categoryId: CATEGORY_IDS.leafAX },
    { ...TXN.febAX, note: "", categoryId: CATEGORY_IDS.leafAX },
    { ...TXN.febBX, note: "", categoryId: CATEGORY_IDS.leafBX },
    { ...TXN.febAY, note: "", categoryId: CATEGORY_IDS.leafAY },
    { ...TXN.marAX, note: "", categoryId: CATEGORY_IDS.leafAX },
  ]);
}
