import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/server/categories.actions";
import { CATEGORY_IDS, seedTwoBranchTree } from "@/test/fixtures";
import { withTempDatabase } from "@/test/temp-db";

/** See the note in `transactions.actions.test.ts` — the guard is real, only the request context is faked. */
const session = vi.hoisted(() => ({ token: null as string | null }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === SESSION_COOKIE_NAME && session.token
        ? { name, value: session.token }
        : undefined,
  }),
}));

/** Invented, and only ever used in-process by these tests. */
const TEST_AUTH_SECRET = "test-secret-for-vitest-0123456789abcdef";

/** A leaf with no transactions of its own — the positive control for deletion. */
const UNUSED_LEAF = "leaf-az";

withTempDatabase("category-actions-test", async () => {
  await seedTwoBranchTree();
  await db.insert(categories).values({
    id: UNUSED_LEAF,
    name: "Mục Z",
    parentId: CATEGORY_IDS.rootB,
  });
});

// Set per test rather than once at module scope: `auth.test.ts` deletes
// AUTH_SECRET in its own hooks, and these files can share a worker with it.
beforeEach(async () => {
  process.env.AUTH_SECRET = TEST_AUTH_SECRET;
  session.token = await createToken();
});

async function exists(id: string): Promise<boolean> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id));
  return rows.length > 0;
}

describe("deleteCategory", () => {
  it("refuses to delete a category that still holds transactions, and keeps it", async () => {
    const result = await deleteCategory(CATEGORY_IDS.leafAY);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/không thể xoá danh mục đã có giao dịch/i);
    expect(await exists(CATEGORY_IDS.leafAY)).toBe(true);
  });

  it("deletes a category with no transactions (positive control)", async () => {
    await expect(deleteCategory(UNUSED_LEAF)).resolves.toEqual({
      success: true,
    });

    expect(await exists(UNUSED_LEAF)).toBe(false);
    // Nothing else went with it.
    expect(await exists(CATEGORY_IDS.rootB)).toBe(true);
    expect(await exists(CATEGORY_IDS.leafBX)).toBe(true);
  });

  it("orphans a deleted category's children up to root level rather than removing them", async () => {
    // rootA holds no transactions itself, so it is deletable.
    await expect(deleteCategory(CATEGORY_IDS.rootA)).resolves.toEqual({
      success: true,
    });

    const [child] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, CATEGORY_IDS.leafAX));
    expect(child.parentId).toBeNull();
  });

  it("refuses a signed-out caller, and deletes nothing", async () => {
    session.token = null;

    const result = await deleteCategory(UNUSED_LEAF);

    expect(result.success).toBe(false);
    expect(await exists(UNUSED_LEAF)).toBe(true);
  });
});

describe("createCategory", () => {
  it("creates a root category", async () => {
    await expect(createCategory({ name: "Nguồn C" })).resolves.toEqual({
      success: true,
    });

    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.name, "Nguồn C"));
    expect(rows).toHaveLength(1);
    expect(rows[0].parentId).toBeNull();
  });

  it("creates a child under a parent that has no transactions", async () => {
    await expect(
      createCategory({ name: "Mục W", parentId: CATEGORY_IDS.rootA })
    ).resolves.toEqual({ success: true });

    const [row] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, "Mục W"));
    expect(row.parentId).toBe(CATEGORY_IDS.rootA);
  });

  it("refuses a child under a parent that already holds transactions", async () => {
    const result = await createCategory({
      name: "Mục W",
      parentId: CATEGORY_IDS.leafAX,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/đã có giao dịch/i);
    expect(
      await db.select().from(categories).where(eq(categories.name, "Mục W"))
    ).toHaveLength(0);
  });

  it("refuses a child under a parent that does not exist", async () => {
    const result = await createCategory({
      name: "Mục W",
      parentId: "no-such-category",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/không tìm thấy danh mục cha/i);
  });
});

describe("updateCategory", () => {
  it("renames a category in place", async () => {
    await expect(
      updateCategory(CATEGORY_IDS.leafAY, {
        name: "Mục Y đổi tên",
        parentId: CATEGORY_IDS.rootA,
      })
    ).resolves.toEqual({ success: true });

    const [row] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, CATEGORY_IDS.leafAY));
    expect(row.name).toBe("Mục Y đổi tên");
    expect(row.parentId).toBe(CATEGORY_IDS.rootA);
  });

  it("refuses to make a category its own parent, and leaves it unchanged", async () => {
    const result = await updateCategory(CATEGORY_IDS.rootA, {
      name: "Nguồn A",
      parentId: CATEGORY_IDS.rootA,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/danh mục con làm danh mục cha/i);
    const [row] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, CATEGORY_IDS.rootA));
    expect(row.parentId).toBeNull();
  });

  it("refuses to reparent a category under its own descendant", async () => {
    const result = await updateCategory(CATEGORY_IDS.rootA, {
      name: "Nguồn A",
      parentId: CATEGORY_IDS.leafAX,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/danh mục con làm danh mục cha/i);

    // The control: the same move onto a non-descendant is allowed.
    await expect(
      updateCategory(UNUSED_LEAF, {
        name: "Mục Z",
        parentId: CATEGORY_IDS.rootA,
      })
    ).resolves.toEqual({ success: true });
  });
});
