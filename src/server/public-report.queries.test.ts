import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  fundingSources,
  shareLinkPurposes,
  shareLinks,
  transactions,
} from "@/lib/db/schema";
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
  it("returns null for an unknown share code", async () => {
    await expect(
      getPublicReport({ code: "does-not-exist" })
    ).resolves.toBeNull();
  });

  it("returns null for a share code the admin has disabled", async () => {
    // The `enabled = true` filter in `getShareLinkByCode` is what makes the
    // "tắt" switch on the management screen mean anything: without it, a link
    // the admin has explicitly turned off keeps serving the full report to
    // anyone still holding the URL.
    await expect(getPublicReport({ code: SHARE_CODE })).resolves.not.toBeNull();

    await db
      .update(shareLinks)
      .set({ enabled: false })
      .where(eq(shareLinks.code, SHARE_CODE));

    await expect(getPublicReport({ code: SHARE_CODE })).resolves.toBeNull();

    // ...and re-enabling brings it back, so the null above is the flag being
    // honoured rather than the link having been damaged.
    await db
      .update(shareLinks)
      .set({ enabled: true })
      .where(eq(shareLinks.code, SHARE_CODE));
    await expect(getPublicReport({ code: SHARE_CODE })).resolves.not.toBeNull();
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

  it("narrows to one Funding Source within the link's scope (the positive control)", async () => {
    // A view filter, not scope (ADR-0002, amendment): the reader looks at one
    // pot, and sees exactly the scoped rows that pot paid for.
    const report = await getPublicReport({
      code: SHARE_CODE,
      fundingSource: FUNDING.b,
    });

    expect(report!.transactions.map((t) => t.id)).toEqual([TXN.febXB.id]);
    expect(report!.total).toBe(TXN.febXB.amount);
    expect(report!.total).toBeLessThan(SCOPED_TOTAL);
    // The Purpose chips are unaffected by the pot chosen — they are scope.
    expect(report!.filterPurposes.map((p) => p.id)).toEqual([
      PURPOSE.x,
      PURPOSE.y,
    ]);
  });

  it("cannot be widened by a Funding Source: scope still wins, even combined with an out-of-scope Purpose", async () => {
    // Nguồn A paid for Mục Z too, but Z is outside the link. Asking for
    // "everything from A" must still stop at the link's Purposes, and asking
    // for "Z from A" must fall back to scope rather than leak Z.
    const fromA = await getPublicReport({
      code: SHARE_CODE,
      fundingSource: FUNDING.a,
    });
    expect(fromA!.transactions.map((t) => t.id)).not.toContain(TXN.febZA.id);
    expect(fromA!.transactions.map((t) => t.id).sort()).toEqual(
      [TXN.janXA.id, TXN.febXA.id, TXN.febYA.id, TXN.marXA.id].sort()
    );

    const zFromA = await getPublicReport({
      code: SHARE_CODE,
      purpose: PURPOSE.z,
      fundingSource: FUNDING.a,
    });
    expect(zFromA!.transactions.map((t) => t.id)).toEqual(
      fromA!.transactions.map((t) => t.id)
    );
    expect(zFromA!.transactions.map((t) => t.purposeId)).not.toContain(
      PURPOSE.z
    );

    // A pot that does not exist narrows to nothing rather than to everything.
    const fromNowhere = await getPublicReport({
      code: SHARE_CODE,
      fundingSource: "no-such-pot",
    });
    expect(fromNowhere!.transactions).toEqual([]);
    expect(fromNowhere!.total).toBe(0);
  });

  it("offers as Funding Source chips exactly the pots that paid for a shared Purpose", async () => {
    // A third pot that only ever paid for Mục Z — outside the link — must not
    // be named to the reader, while the two that touched X or Y must.
    await db.insert(fundingSources).values({ id: "pot-c", name: "Nguồn C" });
    await db.insert(transactions).values({
      id: "txn-feb-z-c",
      amount: 77000,
      note: "",
      date: "2026-02-16T09:00",
      purposeId: PURPOSE.z,
      fundingSourceId: "pot-c",
    });

    const report = await getPublicReport({ code: SHARE_CODE });

    expect(report!.filterFundingSources).toEqual([
      { id: FUNDING.a, name: "Nguồn A" },
      { id: FUNDING.b, name: "Nguồn B" },
    ]);
    expect(report!.filterFundingSources.map((f) => f.id)).not.toContain(
      "pot-c"
    );
    // The list is the link's whole scope, not the current view: narrowing to
    // one Purpose or one pot leaves the chips where they were.
    const narrowed = await getPublicReport({
      code: SHARE_CODE,
      purpose: PURPOSE.y,
      fundingSource: FUNDING.a,
    });
    expect(narrowed!.filterFundingSources).toEqual(
      report!.filterFundingSources
    );
  });

  it("answers 'no report' for a link whose scope is empty, rather than an empty report", async () => {
    // Reachable: deleting an unused Purpose detaches it from every link that
    // named it, and the migration leaves an empty scope behind for a link that
    // pointed only at a pot never spent from. An empty report would present a
    // broken link as a healthy one on a quiet month; `null` sends the reader
    // to the same "not found" screen an unknown code gets.
    //
    // The direction matters most: an empty `IN ()` that fell through to "no
    // filter" would turn the narrowest link into the widest.
    await db
      .delete(shareLinkPurposes)
      .where(eq(shareLinkPurposes.shareLinkId, "link-1"));

    await expect(getPublicReport({ code: SHARE_CODE })).resolves.toBeNull();

    // The controls: the rows and the link row both still exist, so `null` is
    // the empty scope being honoured rather than an empty database.
    expect(await db.select().from(transactions)).not.toHaveLength(0);
    expect(await db.select().from(shareLinks)).toHaveLength(1);
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
