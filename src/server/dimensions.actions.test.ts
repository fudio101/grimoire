import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  fundingSources,
  purposes,
  shareLinkPurposes,
  shareLinks,
} from "@/lib/db/schema";
import {
  createFundingSource,
  deleteFundingSource,
  updateFundingSource,
} from "@/server/funding-sources.actions";
import {
  createPurpose,
  deletePurpose,
  updatePurpose,
} from "@/server/purposes.actions";
import { FUNDING, PURPOSE, seedTwoDimensions } from "@/test/fixtures";
import { signIn, signOut } from "@/test/session";
import { withTempDatabase } from "@/test/temp-db";

vi.mock("next/headers", async () => {
  const { cookieJar } = await import("@/test/session");
  return { cookies: async () => cookieJar() };
});

/**
 * Both dimensions in one file because they share their implementation
 * (`dimensions.server.ts`) while keeping separate public surfaces. Testing
 * them side by side is what shows the shared rule really does apply to both,
 * and that neither reaches into the other's table.
 *
 * The seeded rows all have transactions, so each test that needs a deletable
 * row creates its own — the positive control for the "still in use" refusal.
 */
const UNUSED_PURPOSE = "purpose-unused";
const UNUSED_FUNDING = "pot-unused";

withTempDatabase("dimension-actions-test", async () => {
  await seedTwoDimensions();
  await db
    .insert(purposes)
    .values({ id: UNUSED_PURPOSE, name: "Mục chưa dùng" });
  await db
    .insert(fundingSources)
    .values({ id: UNUSED_FUNDING, name: "Nguồn chưa dùng" });
});

beforeEach(signIn);

async function purposeNames(): Promise<string[]> {
  return (await db.select().from(purposes)).map((p) => p.name).sort();
}

async function fundingNames(): Promise<string[]> {
  return (await db.select().from(fundingSources)).map((f) => f.name).sort();
}

async function exists(
  table: typeof purposes | typeof fundingSources,
  id: string
): Promise<boolean> {
  const rows = await db.select().from(table).where(eq(table.id, id));
  return rows.length > 0;
}

describe("Purpose management", () => {
  it("creates a Purpose with nothing but a name", async () => {
    await expect(createPurpose({ name: "Mục mới" })).resolves.toEqual({
      success: true,
    });

    const rows = await db
      .select()
      .from(purposes)
      .where(eq(purposes.name, "Mục mới"));
    expect(rows).toHaveLength(1);
    // Flat: there is no parent to choose and no column to put one in.
    expect(Object.keys(rows[0]).sort()).toEqual(["createdAt", "id", "name"]);
  });

  it("renames a Purpose in place", async () => {
    await expect(
      updatePurpose(PURPOSE.x, { name: "Mục X đổi tên" })
    ).resolves.toEqual({ success: true });

    const [row] = await db
      .select()
      .from(purposes)
      .where(eq(purposes.id, PURPOSE.x));
    expect(row.name).toBe("Mục X đổi tên");
  });

  it("refuses to rename a Purpose that does not exist", async () => {
    const before = await purposeNames();

    const result = await updatePurpose("no-such-purpose", { name: "Mục ma" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/không tìm thấy mục đích chi/i);
    // Nothing was created as a side effect of the failed rename.
    expect(await purposeNames()).toEqual(before);
  });

  it("refuses to delete a Purpose that still holds transactions, and keeps it", async () => {
    const result = await deletePurpose(PURPOSE.x);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/không thể xoá mục đích chi đã có giao dịch/i);
    expect(await exists(purposes, PURPOSE.x)).toBe(true);
  });

  it("deletes a Purpose with no transactions (positive control)", async () => {
    await expect(deletePurpose(UNUSED_PURPOSE)).resolves.toEqual({
      success: true,
    });

    expect(await exists(purposes, UNUSED_PURPOSE)).toBe(false);
    // Nothing else went with it.
    expect(await exists(purposes, PURPOSE.x)).toBe(true);
    expect(await exists(fundingSources, FUNDING.a)).toBe(true);
  });

  it("removes a deleted Purpose from any share link's scope, keeping the link", async () => {
    // Put the unused Purpose in the link's scope first, so the delete has
    // something to detach.
    await db
      .insert(shareLinkPurposes)
      .values({ shareLinkId: "link-1", purposeId: UNUSED_PURPOSE });

    await expect(deletePurpose(UNUSED_PURPOSE)).resolves.toEqual({
      success: true,
    });

    const scope = await db
      .select()
      .from(shareLinkPurposes)
      .where(eq(shareLinkPurposes.shareLinkId, "link-1"));
    expect(scope.map((r) => r.purposeId)).not.toContain(UNUSED_PURPOSE);
    // The link itself, and the rest of its scope, survive.
    expect(scope.map((r) => r.purposeId).sort()).toEqual(
      [PURPOSE.x, PURPOSE.y].sort()
    );
    expect(await db.select().from(shareLinks)).toHaveLength(1);
  });

  it("refuses a signed-out caller on every Purpose operation", async () => {
    const before = await purposeNames();
    signOut();

    expect((await createPurpose({ name: "Mục lén" })).success).toBe(false);
    expect((await updatePurpose(PURPOSE.x, { name: "Mục lén" })).success).toBe(
      false
    );
    expect((await deletePurpose(UNUSED_PURPOSE)).success).toBe(false);

    expect(await purposeNames()).toEqual(before);
    // The control: with a session, that same delete goes through — so the
    // three refusals above are the auth guard and not a broken fixture.
    await signIn();
    expect((await deletePurpose(UNUSED_PURPOSE)).success).toBe(true);
  });
});

describe("Funding Source management", () => {
  it("creates a Funding Source with nothing but a name", async () => {
    await expect(createFundingSource({ name: "Nguồn mới" })).resolves.toEqual({
      success: true,
    });

    const rows = await db
      .select()
      .from(fundingSources)
      .where(eq(fundingSources.name, "Nguồn mới"));
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["createdAt", "id", "name"]);
  });

  it("renames a Funding Source in place", async () => {
    await expect(
      updateFundingSource(FUNDING.a, { name: "Nguồn A đổi tên" })
    ).resolves.toEqual({ success: true });

    const [row] = await db
      .select()
      .from(fundingSources)
      .where(eq(fundingSources.id, FUNDING.a));
    expect(row.name).toBe("Nguồn A đổi tên");
  });

  it("refuses to delete a Funding Source that still holds transactions, and keeps it", async () => {
    const result = await deleteFundingSource(FUNDING.a);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/không thể xoá nguồn tiền đã có giao dịch/i);
    expect(await exists(fundingSources, FUNDING.a)).toBe(true);
  });

  it("deletes a Funding Source with no transactions (positive control)", async () => {
    await expect(deleteFundingSource(UNUSED_FUNDING)).resolves.toEqual({
      success: true,
    });

    expect(await exists(fundingSources, UNUSED_FUNDING)).toBe(false);
    expect(await exists(fundingSources, FUNDING.a)).toBe(true);
    expect(await exists(purposes, PURPOSE.x)).toBe(true);
  });

  it("refuses a signed-out caller on every Funding Source operation", async () => {
    const before = await fundingNames();
    signOut();

    expect((await createFundingSource({ name: "Nguồn lén" })).success).toBe(
      false
    );
    expect(
      (await updateFundingSource(FUNDING.a, { name: "Nguồn lén" })).success
    ).toBe(false);
    expect((await deleteFundingSource(UNUSED_FUNDING)).success).toBe(false);

    expect(await fundingNames()).toEqual(before);
  });
});

describe("the two dimensions do not reach into each other", () => {
  it("keeps ids in their own table", async () => {
    // A Purpose id is meaningless to the Funding Source actions and vice
    // versa — the tables are independent, so each id is only valid in one and
    // the wrong one is refused rather than quietly reported as deleted.
    const crossDelete = await deleteFundingSource(PURPOSE.x);
    expect(crossDelete.success).toBe(false);
    expect(crossDelete.error).toMatch(/không tìm thấy nguồn tiền/i);
    expect(await exists(purposes, PURPOSE.x)).toBe(true);

    expect((await updatePurpose(FUNDING.a, { name: "Nhầm" })).success).toBe(
      false
    );
    const [pot] = await db
      .select()
      .from(fundingSources)
      .where(eq(fundingSources.id, FUNDING.a));
    expect(pot.name).toBe("Nguồn A");
  });
});
