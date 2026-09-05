import { describe, expect, it } from "vitest";
import { getOverview } from "@/server/overview.queries";
import { CATEGORY_IDS, TXN, seedTwoBranchTree } from "@/test/fixtures";
import { withTempDatabase } from "@/test/temp-db";

withTempDatabase("overview-test", seedTwoBranchTree);

describe("getOverview", () => {
  it("totals and counts only the selected month, and carries the previous month alongside", async () => {
    const overview = await getOverview("2026-02");

    expect(overview.month).toBe("2026-02");
    expect(overview.total).toBe(
      TXN.febAX.amount + TXN.febBX.amount + TXN.febAY.amount
    );
    expect(overview.count).toBe(3);
    expect(overview.previousTotal).toBe(TXN.janAX.amount);
  });

  it("reports zeroes for a month with no transactions, without affecting a month that has them", async () => {
    const empty = await getOverview("2026-05");
    expect(empty.total).toBe(0);
    expect(empty.count).toBe(0);
    expect(empty.byRootCategory).toEqual([]);

    // The control: the same call shape against a populated month is not empty,
    // so the assertions above are about May and not about the query failing.
    const populated = await getOverview("2026-02");
    expect(populated.count).toBeGreaterThan(0);
  });

  it("groups by the root category — the funding pot — rather than by the leaf", async () => {
    const overview = await getOverview("2026-02");

    // Both roots appear under their own names, and neither leaf name ("Mục X",
    // "Mục Y") is ever used as a bucket label.
    expect(overview.byRootCategory).toEqual([
      {
        id: CATEGORY_IDS.rootA,
        name: "Nguồn A",
        total: TXN.febAX.amount + TXN.febAY.amount,
      },
      { id: CATEGORY_IDS.rootB, name: "Nguồn B", total: TXN.febBX.amount },
    ]);
  });

  it("splits one spending purpose across two buckets when it occurs under two roots", async () => {
    // "Mục X" was spent on twice in February, once from each pot. The roll-up
    // never surfaces its combined figure — the headline chart answers "which
    // pot?" and not "on what?". Pinned as the current behaviour.
    const overview = await getOverview("2026-02");
    const combinedPurposeTotal = TXN.febAX.amount + TXN.febBX.amount;

    expect(overview.byRootCategory.map((b) => b.total)).not.toContain(
      combinedPurposeTotal
    );
    expect(overview.byRootCategory.map((b) => b.name)).not.toContain("Mục X");
  });

  it("sorts buckets by total, largest first", async () => {
    const totals = (await getOverview("2026-02")).byRootCategory.map(
      (b) => b.total
    );
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    expect(totals.length).toBeGreaterThan(1);
  });

  it("returns a six-month series ending at the selected month, zero-filling the gaps", async () => {
    const overview = await getOverview("2026-03");

    expect(overview.monthlySeries.map((p) => p.month)).toEqual([
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    expect(overview.monthlySeries.map((p) => p.total)).toEqual([
      0,
      0,
      0,
      TXN.janAX.amount,
      TXN.febAX.amount + TXN.febBX.amount + TXN.febAY.amount,
      TXN.marAX.amount,
    ]);
  });
});
