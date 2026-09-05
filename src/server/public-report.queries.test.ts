import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shareLinkPurposes, transactions } from "@/lib/db/schema";
import { getPublicReport } from "@/server/public-report.queries";
import {
  FUNDING,
  PURPOSE,
  SHARE_CODE,
  TXN,
  seedTwoDimensions,
} from "@/test/fixtures";
import { withTempDatabase } from "@/test/temp-db";

/**
 * The link scopes to {Mục X, Mục Y}; Mục Z is deliberately outside it and has
 * a transaction of its own, so "out of scope stays invisible" is checkable
 * against something that actually exists rather than against nothing.
 */
withTempDatabase("public-report-test", seedTwoDimensions);

const SCOPED_TOTAL =
  TXN.janXA.amount +
  TXN.febXA.amount +
  TXN.febXB.amount +
  TXN.febYA.amount +
  TXN.marXA.amount;

describe("getPublicReport", () => {
  it("returns null for an unknown or disabled share code", async () => {
    await expect(
      getPublicReport({ code: "does-not-exist" })
    ).resolves.toBeNull();
  });

  it("scopes rows and totals to exactly the link's own Purposes", async () => {
    const report = await getPublicReport({ code: SHARE_CODE });

    expect(report).not.toBeNull();
    expect(report!.total).toBe(SCOPED_TOTAL);
    expect(report!.transactions.map((t) => t.id).sort()).toEqual(
      [
        TXN.janXA.id,
        TXN.febXA.id,
        TXN.febXB.id,
        TXN.febYA.id,
        TXN.marXA.id,
      ].sort()
    );
    // Mục Z is not in the link's scope and never appears.
    expect(report!.transactions.map((t) => t.purposeId)).not.toContain(
      PURPOSE.z
    );
  });

  it("returns a shared Purpose across every Funding Source that paid for it", async () => {
    // ADR-0002: scope is one-dimensional, so a link naming a Purpose shows its
    // whole Gross cost however it was funded.
    const report = await getPublicReport({
      code: SHARE_CODE,
      purpose: PURPOSE.x,
    });

    expect(new Set(report!.transactions.map((t) => t.fundingSourceId))).toEqual(
      new Set([FUNDING.a, FUNDING.b])
    );
    expect(report!.total).toBe(
      TXN.janXA.amount + TXN.febXA.amount + TXN.febXB.amount + TXN.marXA.amount
    );
  });

  it("narrows to an in-scope Purpose (the positive control)", async () => {
    const report = await getPublicReport({
      code: SHARE_CODE,
      purpose: PURPOSE.y,
    });

    expect(report!.total).toBe(TXN.febYA.amount);
    expect(report!.transactions.map((t) => t.id)).toEqual([TXN.febYA.id]);
    // Narrowing really narrowed: this is less than the unscoped figure.
    expect(report!.total).toBeLessThan(SCOPED_TOTAL);
  });

  it("ignores a hand-crafted ?purpose= outside the link's scope rather than honouring it", async () => {
    // The security boundary. Paired with the test above — which proves an
    // in-scope value *is* honoured — so a filter that silently did nothing at
    // all could not masquerade as a working guard.
    const unfiltered = await getPublicReport({ code: SHARE_CODE });
    const viaOutOfScope = await getPublicReport({
      code: SHARE_CODE,
      purpose: PURPOSE.z,
    });
    const viaNonexistent = await getPublicReport({
      code: SHARE_CODE,
      purpose: "no-such-purpose",
    });

    expect(viaOutOfScope).toEqual(unfiltered);
    expect(viaNonexistent).toEqual(unfiltered);
    expect(viaOutOfScope!.total).toBe(SCOPED_TOTAL);
    expect(viaOutOfScope!.transactions.map((t) => t.id)).not.toContain(
      TXN.febZA.id
    );
  });

  it("cannot be widened by a Funding Source parameter, because it does not read one", async () => {
    // Scope is one-dimensional (ADR-0002). An extra key on the input is not
    // part of the contract and must not change the answer.
    const unfiltered = await getPublicReport({ code: SHARE_CODE });
    const withExtraKey = await getPublicReport({
      code: SHARE_CODE,
      ...({ fundingSource: FUNDING.b } as Record<string, string>),
    });

    expect(withExtraKey).toEqual(unfiltered);
  });

  it("shows nothing, not everything, when a link's scope is empty", async () => {
    // Reachable: deleting an unused Purpose detaches it from every link that
    // named it, and a link can end up naming none. An empty `IN ()` that fell
    // through to "no filter" would turn the narrowest link into the widest —
    // so the direction this fails in is the whole point.
    await db
      .delete(shareLinkPurposes)
      .where(eq(shareLinkPurposes.shareLinkId, "link-1"));

    const report = await getPublicReport({ code: SHARE_CODE });

    expect(report).not.toBeNull();
    expect(report!.transactions).toEqual([]);
    expect(report!.total).toBe(0);
    expect(report!.filterPurposes).toEqual([]);

    // The control: those rows are still in the database, so "nothing" is the
    // scope being respected rather than an empty fixture.
    expect(await db.select().from(transactions)).not.toHaveLength(0);
  });

  it("ships the link's own Purposes as a flat list, and nothing else", async () => {
    const report = await getPublicReport({ code: SHARE_CODE });

    expect(report!.filterPurposes).toEqual([
      { id: PURPOSE.x, name: "Mục X" },
      { id: PURPOSE.y, name: "Mục Y" },
    ]);
    // No hierarchy to re-parent, and no out-of-scope name to leak.
    expect(report!.filterPurposes.map((p) => p.id)).not.toContain(PURPOSE.z);
    for (const purpose of report!.filterPurposes) {
      expect(Object.keys(purpose).sort()).toEqual(["id", "name"]);
    }
  });

  it("names both dimensions on every row it ships", async () => {
    const report = await getPublicReport({ code: SHARE_CODE });
    const row = report!.transactions.find((t) => t.id === TXN.febXB.id)!;

    expect(row).toMatchObject({
      purposeName: "Mục X",
      fundingSourceName: "Nguồn B",
    });
  });

  it("reports the previous month only for a single-month view", async () => {
    const singleMonth = await getPublicReport({
      code: SHARE_CODE,
      fromMonth: "2026-02",
      toMonth: "2026-02",
    });
    expect(singleMonth!.previousTotal).toBe(TXN.janXA.amount);

    const range = await getPublicReport({
      code: SHARE_CODE,
      fromMonth: "2026-01",
      toMonth: "2026-03",
    });
    expect(range!.previousTotal).toBeNull();
  });
});
