import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import type { TransactionInput } from "@/lib/schemas";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/server/transactions.actions";
import { CATEGORY_IDS, TXN, seedTwoBranchTree } from "@/test/fixtures";
import { withTempDatabase } from "@/test/temp-db";

/**
 * The actions run their real `requireAuthForAction()` guard, which reads
 * `cookies()` from `next/headers` — a Next.js request context that does not
 * exist outside a server request. Only that context is faked: the cookie
 * carries a genuine token minted by `createToken`, so `verifyToken` and the
 * guard itself are exercised rather than stubbed, and clearing the token below
 * is a real signed-out request.
 */
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

withTempDatabase("transaction-actions-test", seedTwoBranchTree);

// Set per test rather than once at module scope: `auth.test.ts` deletes
// AUTH_SECRET in its own hooks, and these files can share a worker with it.
beforeEach(async () => {
  process.env.AUTH_SECRET = TEST_AUTH_SECRET;
  session.token = await createToken();
});

function input(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    amount: 12345,
    note: "ghi chú thử",
    date: "2026-04-01T08:30",
    categoryId: CATEGORY_IDS.leafAX,
    ...overrides,
  };
}

async function allRows() {
  return db.select().from(transactions);
}

const SEEDED_ROWS = 5;

describe("createTransaction", () => {
  it("accepts a transaction on a leaf category", async () => {
    await expect(createTransaction(input())).resolves.toEqual({
      success: true,
    });

    const rows = await allRows();
    expect(rows).toHaveLength(SEEDED_ROWS + 1);
    expect(rows.some((r) => r.note === "ghi chú thử")).toBe(true);
  });

  it("refuses a transaction on a parent category, and writes nothing", async () => {
    const result = await createTransaction(
      input({ categoryId: CATEGORY_IDS.rootA })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/danh mục cụ thể/i);
    expect(await allRows()).toHaveLength(SEEDED_ROWS);
  });

  it("refuses a transaction on a category that does not exist, and writes nothing", async () => {
    const result = await createTransaction(
      input({ categoryId: "no-such-category" })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/không tìm thấy danh mục/i);
    expect(await allRows()).toHaveLength(SEEDED_ROWS);
  });

  it("refuses a signed-out caller, and writes nothing", async () => {
    session.token = null;

    const result = await createTransaction(input());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/đăng nhập/i);
    expect(await allRows()).toHaveLength(SEEDED_ROWS);

    // The control: the identical input succeeds once a session is present, so
    // the refusal above is the guard and not a bad fixture.
    session.token = await createToken();
    await expect(createTransaction(input())).resolves.toEqual({
      success: true,
    });
    expect(await allRows()).toHaveLength(SEEDED_ROWS + 1);
  });

  it("rejects a non-positive amount before reaching the database", async () => {
    await expect(createTransaction(input({ amount: 0 }))).rejects.toThrow();
    expect(await allRows()).toHaveLength(SEEDED_ROWS);
  });
});

describe("updateTransaction", () => {
  async function reload(id: string) {
    const [row] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return row;
  }

  it("moves a transaction to another leaf category", async () => {
    await expect(
      updateTransaction(
        TXN.janAX.id,
        input({ categoryId: CATEGORY_IDS.leafAY, amount: 67890 })
      )
    ).resolves.toEqual({ success: true });

    const row = await reload(TXN.janAX.id);
    expect(row.categoryId).toBe(CATEGORY_IDS.leafAY);
    expect(row.amount).toBe(67890);
  });

  it("refuses a move onto a parent category, and leaves the row untouched", async () => {
    const before = await reload(TXN.janAX.id);

    const result = await updateTransaction(
      TXN.janAX.id,
      input({ categoryId: CATEGORY_IDS.rootB })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/danh mục cụ thể/i);
    expect(await reload(TXN.janAX.id)).toEqual(before);
  });

  it("refuses a move onto a category that does not exist, and leaves the row untouched", async () => {
    const before = await reload(TXN.janAX.id);

    const result = await updateTransaction(
      TXN.janAX.id,
      input({ categoryId: "no-such-category" })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/không tìm thấy danh mục/i);
    expect(await reload(TXN.janAX.id)).toEqual(before);
  });

  it("refuses a signed-out caller, and leaves the row untouched", async () => {
    const before = await reload(TXN.janAX.id);
    session.token = null;

    const result = await updateTransaction(TXN.janAX.id, input());

    expect(result.success).toBe(false);
    expect(await reload(TXN.janAX.id)).toEqual(before);
  });
});

describe("deleteTransaction", () => {
  it("removes exactly the named transaction", async () => {
    await expect(deleteTransaction(TXN.febBX.id)).resolves.toEqual({
      success: true,
    });

    const ids = (await allRows()).map((r) => r.id);
    expect(ids).not.toContain(TXN.febBX.id);
    expect(ids).toHaveLength(SEEDED_ROWS - 1);
    expect(ids).toContain(TXN.febAX.id);
  });

  it("refuses a signed-out caller, and deletes nothing", async () => {
    session.token = null;

    const result = await deleteTransaction(TXN.febBX.id);

    expect(result.success).toBe(false);
    expect((await allRows()).map((r) => r.id)).toContain(TXN.febBX.id);
  });
});
