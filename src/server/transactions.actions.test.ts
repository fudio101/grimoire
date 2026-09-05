import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import type { TransactionInput } from "@/lib/schemas";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/server/transactions.actions";
import { FUNDING, PURPOSE, TXN, seedTwoDimensions } from "@/test/fixtures";
import { signIn, signOut } from "@/test/session";
import { withTempDatabase } from "@/test/temp-db";

vi.mock("next/headers", async () => {
  const { cookieJar } = await import("@/test/session");
  return { cookies: async () => cookieJar() };
});

withTempDatabase("transaction-actions-test", seedTwoDimensions);

beforeEach(signIn);

function input(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    amount: 12345,
    note: "ghi chú thử",
    date: "2026-04-01T08:30",
    purposeId: PURPOSE.x,
    fundingSourceId: FUNDING.a,
    ...overrides,
  };
}

async function allRows() {
  return db.select().from(transactions);
}

const SEEDED_ROWS = Object.keys(TXN).length;

describe("createTransaction", () => {
  it("accepts a Purpose and a Funding Source, and stores both", async () => {
    await expect(
      createTransaction(
        input({ purposeId: PURPOSE.y, fundingSourceId: FUNDING.b })
      )
    ).resolves.toEqual({ success: true });

    const rows = await allRows();
    expect(rows).toHaveLength(SEEDED_ROWS + 1);
    expect(rows.find((r) => r.note === "ghi chú thử")).toMatchObject({
      purposeId: PURPOSE.y,
      fundingSourceId: FUNDING.b,
    });
  });

  it("attaches to any Purpose at all", async () => {
    // The positive control replacing the deleted leaf-only rule: under the
    // tree, only leaves were attachable and a parent was refused. Every
    // Purpose is a valid target now, so all three succeed.
    for (const purposeId of Object.values(PURPOSE)) {
      await expect(createTransaction(input({ purposeId }))).resolves.toEqual({
        success: true,
      });
    }
    expect(await allRows()).toHaveLength(
      SEEDED_ROWS + Object.values(PURPOSE).length
    );
  });

  it("refuses a Purpose that does not exist, and writes nothing", async () => {
    const result = await createTransaction(
      input({ purposeId: "no-such-purpose" })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/không tìm thấy mục đích chi/i);
    expect(await allRows()).toHaveLength(SEEDED_ROWS);
  });

  it("refuses a Funding Source that does not exist, and writes nothing", async () => {
    const result = await createTransaction(
      input({ fundingSourceId: "no-such-pot" })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/không tìm thấy nguồn tiền/i);
    expect(await allRows()).toHaveLength(SEEDED_ROWS);
  });

  it("checks the two dimensions independently", async () => {
    // A valid Purpose does not excuse an invalid Funding Source, and the
    // error names the dimension that was actually wrong.
    const badPot = await createTransaction(
      input({ purposeId: PURPOSE.z, fundingSourceId: "no-such-pot" })
    );
    expect(badPot.error).toMatch(/nguồn tiền/i);

    const badPurpose = await createTransaction(
      input({ purposeId: "no-such-purpose", fundingSourceId: FUNDING.b })
    );
    expect(badPurpose.error).toMatch(/mục đích chi/i);

    // The control: that same pair of valid halves together is accepted.
    await expect(
      createTransaction(
        input({ purposeId: PURPOSE.z, fundingSourceId: FUNDING.b })
      )
    ).resolves.toEqual({ success: true });
  });

  it("refuses a signed-out caller, and writes nothing", async () => {
    signOut();

    const result = await createTransaction(input());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/đăng nhập/i);
    expect(await allRows()).toHaveLength(SEEDED_ROWS);

    // The control: the identical input succeeds once a session is present, so
    // the refusal above is the guard and not a bad fixture.
    await signIn();
    await expect(createTransaction(input())).resolves.toEqual({
      success: true,
    });
    expect(await allRows()).toHaveLength(SEEDED_ROWS + 1);
  });

  it("rejects a non-positive amount before reaching the database", async () => {
    await expect(createTransaction(input({ amount: 0 }))).rejects.toThrow();
    expect(await allRows()).toHaveLength(SEEDED_ROWS);
  });

  it("rejects a missing dimension before reaching the database", async () => {
    await expect(createTransaction(input({ purposeId: "" }))).rejects.toThrow();
    await expect(
      createTransaction(input({ fundingSourceId: "" }))
    ).rejects.toThrow();
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

  it("moves a transaction along either dimension", async () => {
    await expect(
      updateTransaction(
        TXN.janXA.id,
        input({
          purposeId: PURPOSE.y,
          fundingSourceId: FUNDING.b,
          amount: 67890,
        })
      )
    ).resolves.toEqual({ success: true });

    expect(await reload(TXN.janXA.id)).toMatchObject({
      purposeId: PURPOSE.y,
      fundingSourceId: FUNDING.b,
      amount: 67890,
    });
  });

  it("refuses a move onto a Purpose that does not exist, and leaves the row untouched", async () => {
    const before = await reload(TXN.janXA.id);

    const result = await updateTransaction(
      TXN.janXA.id,
      input({ purposeId: "no-such-purpose" })
    );

    expect(result.success).toBe(false);
    expect(await reload(TXN.janXA.id)).toEqual(before);
  });

  it("refuses a move onto a Funding Source that does not exist, and leaves the row untouched", async () => {
    const before = await reload(TXN.janXA.id);

    const result = await updateTransaction(
      TXN.janXA.id,
      input({ fundingSourceId: "no-such-pot" })
    );

    expect(result.success).toBe(false);
    expect(await reload(TXN.janXA.id)).toEqual(before);
  });

  it("refuses a signed-out caller, and leaves the row untouched", async () => {
    const before = await reload(TXN.janXA.id);
    signOut();

    const result = await updateTransaction(TXN.janXA.id, input());

    expect(result.success).toBe(false);
    expect(await reload(TXN.janXA.id)).toEqual(before);
  });
});

describe("deleteTransaction", () => {
  it("removes exactly the named transaction", async () => {
    await expect(deleteTransaction(TXN.febXB.id)).resolves.toEqual({
      success: true,
    });

    const ids = (await allRows()).map((r) => r.id);
    expect(ids).not.toContain(TXN.febXB.id);
    expect(ids).toHaveLength(SEEDED_ROWS - 1);
    expect(ids).toContain(TXN.febXA.id);
  });

  it("refuses a signed-out caller, and deletes nothing", async () => {
    signOut();

    const result = await deleteTransaction(TXN.febXB.id);

    expect(result.success).toBe(false);
    expect((await allRows()).map((r) => r.id)).toContain(TXN.febXB.id);
  });
});
