import { describe, expect, it } from "vitest";
import { getTransactions } from "@/lib/db/queries";
import { CATEGORY_IDS, TXN, seedTwoBranchTree } from "@/test/fixtures";
import { withTempDatabase } from "@/test/temp-db";

withTempDatabase("queries-test", seedTwoBranchTree);

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
      TXN.marAX.id,
      TXN.febAY.id,
      TXN.febBX.id,
      TXN.febAX.id,
      TXN.janAX.id,
    ]);
  });

  it("returns every row, newest first, when given an empty filter object", async () => {
    expect(await idsFor({})).toEqual(await idsFor());
  });

  it("rolls a parent category up over its whole subtree", async () => {
    const ids = await idsFor({ categoryId: CATEGORY_IDS.rootA });

    // Everything under Nguồn A, and — the control that makes this mean
    // something — nothing from the other branch.
    expect(ids).toEqual([
      TXN.marAX.id,
      TXN.febAY.id,
      TXN.febAX.id,
      TXN.janAX.id,
    ]);
    expect(ids).not.toContain(TXN.febBX.id);
  });

  it("narrows to a single leaf category", async () => {
    expect(await idsFor({ categoryId: CATEGORY_IDS.leafAX })).toEqual([
      TXN.marAX.id,
      TXN.febAX.id,
      TXN.janAX.id,
    ]);
  });

  it("returns nothing for a category id that does not exist", async () => {
    // Paired with the leaf case above: an empty result here is an empty
    // result *because* the id matches nothing, not because the filter is
    // broken for every id.
    expect(await idsFor({ categoryId: "no-such-category" })).toEqual([]);
    expect(await idsFor({ categoryId: CATEGORY_IDS.leafBX })).toEqual([
      TXN.febBX.id,
    ]);
  });

  it("cannot select the same purpose across both branches at once", async () => {
    // The failure that motivates the two-dimension rework, pinned as it
    // stands today: "Mục X" exists under both roots, the filter accepts one
    // id, and no single id selects both sets without also dragging in "Mục Y".
    const viaBranchA = await idsFor({ categoryId: CATEGORY_IDS.leafAX });
    const viaBranchB = await idsFor({ categoryId: CATEGORY_IDS.leafBX });
    const viaTheirCommonAncestor = await idsFor();

    expect(viaBranchA).not.toContain(TXN.febBX.id);
    expect(viaBranchB).not.toContain(TXN.febAX.id);
    expect(viaTheirCommonAncestor).toContain(TXN.febAY.id);
  });

  it("bounds an inclusive month range from below", async () => {
    expect(await idsFor({ fromMonth: "2026-02" })).toEqual([
      TXN.marAX.id,
      TXN.febAY.id,
      TXN.febBX.id,
      TXN.febAX.id,
    ]);
  });

  it("bounds an inclusive month range from above, keeping the last day of the month", async () => {
    expect(await idsFor({ toMonth: "2026-02" })).toEqual([
      TXN.febAY.id,
      TXN.febBX.id,
      TXN.febAX.id,
      TXN.janAX.id,
    ]);
  });

  it("bounds a month range from both ends", async () => {
    expect(await idsFor({ fromMonth: "2026-02", toMonth: "2026-02" })).toEqual([
      TXN.febAY.id,
      TXN.febBX.id,
      TXN.febAX.id,
    ]);
  });

  it("intersects a category filter with a month filter rather than choosing between them", async () => {
    const ids = await idsFor({
      categoryId: CATEGORY_IDS.rootA,
      fromMonth: "2026-02",
      toMonth: "2026-02",
    });

    expect(ids).toEqual([TXN.febAY.id, TXN.febAX.id]);
    // Each half of the intersection excludes something the other half keeps.
    expect(ids).not.toContain(TXN.febBX.id); // dropped by the category filter
    expect(ids).not.toContain(TXN.marAX.id); // dropped by the month filter
  });

  it("joins the category name onto each row", async () => {
    const rows = await getTransactions({ categoryId: CATEGORY_IDS.leafAY });
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryName).toBe("Mục Y");
    expect(rows[0].amount).toBe(TXN.febAY.amount);
  });
});
