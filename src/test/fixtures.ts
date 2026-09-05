import { db } from "@/lib/db";
import {
  fundingSources,
  purposes,
  shareLinkPurposes,
  shareLinks,
  transactions,
} from "@/lib/db/schema";

/**
 * The smallest fixture that exercises both dimensions independently.
 *
 * Three Purposes and two Funding Sources, with "Mục X" spent from *both* pots.
 * That combination is the point: under the old category tree the same purpose
 * appeared once per pot as sibling leaves in different branches, and no single
 * filter value could select them together. Here it is one Purpose, and asking
 * for its total across every pot is one query.
 *
 * The share link scopes to {X, Y}, leaving Z outside it so scope can be tested
 * against something that must stay invisible.
 *
 * Every name, amount and date below is invented for these tests. Nothing here
 * is derived from the production snapshot — this repository is public.
 */
export const PURPOSE = {
  x: "purpose-x",
  y: "purpose-y",
  z: "purpose-z",
} as const;

export const FUNDING = {
  a: "pot-a",
  b: "pot-b",
} as const;

export const SHARE_CODE = "test-code";

/**
 * Amounts are distinct multiples of eleven thousand so that any total
 * identifies exactly which rows produced it — a wrong subset cannot
 * coincidentally sum to the right figure.
 */
export const TXN = {
  janXA: {
    id: "txn-jan-x-a",
    amount: 11000,
    date: "2026-01-10T09:00",
    purposeId: PURPOSE.x,
    fundingSourceId: FUNDING.a,
  },
  febXA: {
    id: "txn-feb-x-a",
    amount: 22000,
    date: "2026-02-11T09:00",
    purposeId: PURPOSE.x,
    fundingSourceId: FUNDING.a,
  },
  febXB: {
    id: "txn-feb-x-b",
    amount: 33000,
    date: "2026-02-12T09:00",
    purposeId: PURPOSE.x,
    fundingSourceId: FUNDING.b,
  },
  febYA: {
    id: "txn-feb-y-a",
    amount: 44000,
    date: "2026-02-13T09:00",
    purposeId: PURPOSE.y,
    fundingSourceId: FUNDING.a,
  },
  febZA: {
    id: "txn-feb-z-a",
    amount: 99000,
    date: "2026-02-15T09:00",
    purposeId: PURPOSE.z,
    fundingSourceId: FUNDING.a,
  },
  marXA: {
    id: "txn-mar-x-a",
    amount: 55000,
    date: "2026-03-14T09:00",
    purposeId: PURPOSE.x,
    fundingSourceId: FUNDING.a,
  },
} as const;

export async function seedTwoDimensions(): Promise<void> {
  await db.insert(purposes).values([
    { id: PURPOSE.x, name: "Mục X" },
    { id: PURPOSE.y, name: "Mục Y" },
    { id: PURPOSE.z, name: "Mục Z" },
  ]);

  await db.insert(fundingSources).values([
    { id: FUNDING.a, name: "Nguồn A" },
    { id: FUNDING.b, name: "Nguồn B" },
  ]);

  await db.insert(shareLinks).values({
    id: "link-1",
    code: SHARE_CODE,
    name: "Test link",
    enabled: true,
  });

  await db.insert(shareLinkPurposes).values([
    { shareLinkId: "link-1", purposeId: PURPOSE.x },
    { shareLinkId: "link-1", purposeId: PURPOSE.y },
  ]);

  await db
    .insert(transactions)
    .values(Object.values(TXN).map((t) => ({ ...t, note: "" })));
}
