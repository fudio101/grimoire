import { describe, expect, it } from "vitest";
import { getTransactions } from "@/lib/db/queries";
import { FUNDING, PURPOSE, TXN, seedTwoDimensions } from "@/test/fixtures";
import { withTempDatabase } from "@/test/temp-db";

withTempDatabase("queries-test", seedTwoDimensions);

/** Row ids in the order `getTransactions` returned them. */
async function idsFor(
  filters?: Parameters<typeof getTransactions>[0]
): Promise<string[]> {
  const rows = await getTransactions(filters);
  return rows.map((r) => r.id);
}

describe("getTransactions", () => {
  it("returns every row, newest first, when given no filters", async () => {
    expect(await idsFor()).toEqual([
      TXN.marXA.id,
      TXN.febZA.id,
      TXN.febYA.id,
      TXN.febXB.id,
      TXN.febXA.id,
      TXN.janXA.id,
    ]);
  });

  it("returns every row, newest first, when given an empty filter object", async () => {
    expect(await idsFor({})).toEqual(await idsFor());
  });

  it("selects one Purpose across every Funding Source", async () => {
    // The question the category tree could not answer at all: "Mục X" was two
    // leaves in two branches, and the filter took one id. One column
    // comparison now covers both pots.
    const ids = await idsFor({ purposeId: PURPOSE.x });

    expect(ids).toEqual([
      TXN.marXA.id,
      TXN.febXB.id,
      TXN.febXA.id,
      TXN.janXA.id,
    ]);
    // Both pots are represented, and nothing from another Purpose is.
    const rows = await getTransactions({ purposeId: PURPOSE.x });
    expect(new Set(rows.map((r) => r.fundingSourceId))).toEqual(
      new Set([FUNDING.a, FUNDING.b])
    );
    expect(ids).not.toContain(TXN.febYA.id);
  });

  it("selects one Funding Source across every Purpose", async () => {
    const ids = await idsFor({ fundingSourceId: FUNDING.b });

    expect(ids).toEqual([TXN.febXB.id]);
    // The control: the other pot is not empty, so the single row above is a
    // narrowing rather than a filter that matches almost nothing.
    expect(await idsFor({ fundingSourceId: FUNDING.a })).toHaveLength(5);
  });

  it("intersects the two dimensions rather than choosing between them", async () => {
    expect(
      await idsFor({ purposeId: PURPOSE.x, fundingSourceId: FUNDING.b })
    ).toEqual([TXN.febXB.id]);

    expect(
      await idsFor({ purposeId: PURPOSE.x, fundingSourceId: FUNDING.a })
    ).toEqual([TXN.marXA.id, TXN.febXA.id, TXN.janXA.id]);

    // A combination nothing satisfies returns nothing — paired with the two
    // above, which prove each half is individually non-empty.
    expect(
      await idsFor({ purposeId: PURPOSE.y, fundingSourceId: FUNDING.b })
    ).toEqual([]);
  });

  it("returns nothing for an id that does not exist, on either dimension", async () => {
    expect(await idsFor({ purposeId: "no-such-purpose" })).toEqual([]);
    expect(await idsFor({ fundingSourceId: "no-such-pot" })).toEqual([]);
    // Control: a real id on each dimension does return rows.
    expect(await idsFor({ purposeId: PURPOSE.z })).toEqual([TXN.febZA.id]);
    expect(await idsFor({ fundingSourceId: FUNDING.b })).toEqual([
      TXN.febXB.id,
    ]);
  });

  it("bounds an inclusive month range from below", async () => {
    expect(await idsFor({ fromMonth: "2026-02" })).toEqual([
      TXN.marXA.id,
      TXN.febZA.id,
      TXN.febYA.id,
      TXN.febXB.id,
      TXN.febXA.id,
    ]);
  });

  it("bounds an inclusive month range from above, keeping the last day of the month", async () => {
    expect(await idsFor({ toMonth: "2026-02" })).toEqual([
      TXN.febZA.id,
      TXN.febYA.id,
      TXN.febXB.id,
      TXN.febXA.id,
      TXN.janXA.id,
    ]);
  });

  it("bounds a month range from both ends", async () => {
    expect(await idsFor({ fromMonth: "2026-02", toMonth: "2026-02" })).toEqual([
      TXN.febZA.id,
      TXN.febYA.id,
      TXN.febXB.id,
      TXN.febXA.id,
    ]);
  });

  it("combines a month range with both dimensions at once", async () => {
    const ids = await idsFor({
      purposeId: PURPOSE.x,
      fundingSourceId: FUNDING.a,
      fromMonth: "2026-02",
      toMonth: "2026-02",
    });

    expect(ids).toEqual([TXN.febXA.id]);
    // Each of the three predicates excludes something the other two keep.
    expect(ids).not.toContain(TXN.febXB.id); // dropped by the Funding Source
    expect(ids).not.toContain(TXN.febYA.id); // dropped by the Purpose
    expect(ids).not.toContain(TXN.marXA.id); // dropped by the month
  });

  it("joins both dimensions' names onto each row", async () => {
    const rows = await getTransactions({
      purposeId: PURPOSE.x,
      fundingSourceId: FUNDING.b,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      amount: TXN.febXB.amount,
      purposeName: "Mục X",
      fundingSourceName: "Nguồn B",
    });
  });
});
