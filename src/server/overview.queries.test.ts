import { describe, expect, it } from "vitest";
import { getOverview } from "@/server/overview.queries";
import { FUNDING, PURPOSE, TXN, seedTwoDimensions } from "@/test/fixtures";
import { withTempDatabase } from "@/test/temp-db";

withTempDatabase("overview-test", seedTwoDimensions);

const FEB_TOTAL =
  TXN.febXA.amount + TXN.febXB.amount + TXN.febYA.amount + TXN.febZA.amount;

describe("getOverview", () => {
  it("totals and counts only the selected month, and carries the previous month alongside", async () => {
    const overview = await getOverview("2026-02");

    expect(overview.month).toBe("2026-02");
    expect(overview.total).toBe(FEB_TOTAL);
    expect(overview.count).toBe(4);
    expect(overview.previousTotal).toBe(TXN.janXA.amount);
  });

  it("reports zeroes for a month with no transactions, without affecting a month that has them", async () => {
    const empty = await getOverview("2026-05");
    expect(empty.total).toBe(0);
    expect(empty.count).toBe(0);
    expect(empty.byPurpose).toEqual([]);

    // The control: the same call shape against a populated month is not empty,
    // so the assertions above are about May and not about the query failing.
    const populated = await getOverview("2026-02");
    expect(populated.count).toBeGreaterThan(0);
  });

  it("groups by Purpose — what the money was spent on — not by the pot it came from", async () => {
    const overview = await getOverview("2026-02");

    expect(
      overview.byPurpose.map(({ id, name, total }) => ({ id, name, total }))
    ).toEqual([
      // "Mục X" was funded from both pots in February and appears once, at its
      // combined Gross cost. Under the old root-category roll-up this was two
      // separate buckets named after the pots, and this figure did not exist.
      { id: PURPOSE.z, name: "Mục Z", total: TXN.febZA.amount },
      {
        id: PURPOSE.x,
        name: "Mục X",
        total: TXN.febXA.amount + TXN.febXB.amount,
      },
      { id: PURPOSE.y, name: "Mục Y", total: TXN.febYA.amount },
    ]);

    // No bucket is named after a Funding Source.
    expect(overview.byPurpose.map((b) => b.name)).not.toContain("Nguồn A");
    expect(overview.byPurpose.map((b) => b.name)).not.toContain("Nguồn B");
  });

  it("splits each Gross cost across the Funding Sources that paid it", async () => {
    const overview = await getOverview("2026-02");
    const mucX = overview.byPurpose.find((b) => b.id === PURPOSE.x)!;

    expect(mucX.byFundingSource).toEqual([
      { id: FUNDING.b, name: "Nguồn B", total: TXN.febXB.amount },
      { id: FUNDING.a, name: "Nguồn A", total: TXN.febXA.amount },
    ]);

    // A Purpose paid from one pot has one share, not an empty split.
    const mucY = overview.byPurpose.find((b) => b.id === PURPOSE.y)!;
    expect(mucY.byFundingSource).toEqual([
      { id: FUNDING.a, name: "Nguồn A", total: TXN.febYA.amount },
    ]);
  });

  it("keeps every Gross cost equal to the sum of its shares", async () => {
    const overview = await getOverview("2026-02");

    // An identity, not a literal: the shares partition exactly the rows the
    // total sums, so this has to hold for every Purpose in every month.
    expect(overview.byPurpose.length).toBeGreaterThan(0);
    for (const bucket of overview.byPurpose) {
      expect(bucket.byFundingSource.length).toBeGreaterThan(0);
      expect(
        bucket.byFundingSource.reduce((sum, share) => sum + share.total, 0)
      ).toBe(bucket.total);
    }
    // ...and the buckets themselves partition the month's total.
    expect(overview.byPurpose.reduce((sum, b) => sum + b.total, 0)).toBe(
      overview.total
    );
  });

  it("sorts buckets by Gross cost, largest first", async () => {
    const totals = (await getOverview("2026-02")).byPurpose.map((b) => b.total);
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
      TXN.janXA.amount,
      FEB_TOTAL,
      TXN.marXA.amount,
    ]);
  });
});
