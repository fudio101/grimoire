import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  categories,
  shareLinkCategories,
  shareLinks,
  transactions,
} from "@/lib/db/schema";
import { getPublicReport } from "@/server/public-report.queries";
import { withTempDatabase } from "@/test/temp-db";

/**
 * A small category tree, deliberately shaped so the tests below can prove
 * three things at once: a share link's own scope isn't leaked past, an
 * out-of-scope drill-down attempt (`?category=`) is ignored rather than
 * honoured, and a transaction's category path never names an ancestor
 * outside the link's scope.
 *
 *   Ăn uống (cat-a, root, OUT of the link's scope)
 *   └─ Nhà hàng (cat-b, IN scope)
 *      └─ Cơm trưa (cat-c, IN scope)
 *   Di chuyển (cat-d, separate root, OUT of scope, has its own transaction)
 *
 * The link "test-code" shares only {cat-b, cat-c}.
 */
async function seed(): Promise<void> {
  await db.insert(categories).values([
    { id: "cat-a", name: "Ăn uống", parentId: null },
    { id: "cat-b", name: "Nhà hàng", parentId: "cat-a" },
    { id: "cat-c", name: "Cơm trưa", parentId: "cat-b" },
    { id: "cat-d", name: "Di chuyển", parentId: null },
  ]);

  await db.insert(shareLinks).values({
    id: "link-1",
    code: "test-code",
    name: "Test link",
    enabled: true,
  });

  await db.insert(shareLinkCategories).values([
    { shareLinkId: "link-1", categoryId: "cat-b" },
    { shareLinkId: "link-1", categoryId: "cat-c" },
  ]);

  await db.insert(transactions).values([
    {
      id: "txn-b",
      amount: 100000,
      note: "",
      date: "2026-01-15T10:00",
      categoryId: "cat-b",
    },
    {
      id: "txn-c",
      amount: 50000,
      note: "",
      date: "2026-01-16T10:00",
      categoryId: "cat-c",
    },
    {
      id: "txn-d",
      amount: 999999,
      note: "",
      date: "2026-01-17T10:00",
      categoryId: "cat-d",
    },
  ]);
}

withTempDatabase("public-report-test", seed);

describe("getPublicReport", () => {
  it("returns null for an unknown or disabled share code", async () => {
    await expect(
      getPublicReport({ code: "does-not-exist" })
    ).resolves.toBeNull();
  });

  it("scopes totals and rows to exactly the link's own categories (positive control)", async () => {
    const report = await getPublicReport({ code: "test-code" });
    expect(report).not.toBeNull();
    expect(report!.total).toBe(150000); // cat-b + cat-c, never cat-d's 999999
    expect(report!.transactions.map((t) => t.id).sort()).toEqual([
      "txn-b",
      "txn-c",
    ]);
  });

  it("narrows correctly when drilling into an in-scope category", async () => {
    const report = await getPublicReport({
      code: "test-code",
      category: "cat-c",
    });
    expect(report!.total).toBe(50000);
    expect(report!.transactions.map((t) => t.id)).toEqual(["txn-c"]);
  });

  it("ignores a hand-crafted ?category= outside the link's own scope rather than widening it", async () => {
    // cat-a (the parent of the link's own scope) and cat-d are both outside
    // {cat-b, cat-c} — drilling into either must not change the result from
    // the unfiltered report, and must never pull in cat-d's transaction.
    const unfiltered = await getPublicReport({ code: "test-code" });
    const viaParent = await getPublicReport({
      code: "test-code",
      category: "cat-a",
    });
    const viaUnrelatedRoot = await getPublicReport({
      code: "test-code",
      category: "cat-d",
    });

    expect(viaParent).toEqual(unfiltered);
    expect(viaUnrelatedRoot).toEqual(unfiltered);
    expect(viaParent!.total).toBe(150000);
  });

  it("never names an out-of-scope ancestor in a transaction's category path", async () => {
    const report = await getPublicReport({ code: "test-code" });
    const txnC = report!.transactions.find((t) => t.id === "txn-c")!;

    // The real path to "Cơm trưa" is Ăn uống → Nhà hàng → Cơm trưa, but "Ăn
    // uống" (cat-a) is outside this link's scope and must never appear.
    expect(txnC.categoryPathParts).toEqual(["Nhà hàng", "Cơm trưa"]);
    expect(txnC.categoryPathParts).not.toContain("Ăn uống");
  });

  it("lists filter categories against the nearest in-scope ancestor, not the true parent", async () => {
    const report = await getPublicReport({ code: "test-code" });
    const catB = report!.filterCategories.find((c) => c.id === "cat-b")!;
    const catC = report!.filterCategories.find((c) => c.id === "cat-c")!;

    // cat-b's real parent (cat-a) is out of scope, so it has no in-scope ancestor.
    expect(catB.parentId).toBeNull();
    // cat-c's real parent (cat-b) IS in scope.
    expect(catC.parentId).toBe("cat-b");
  });
});
