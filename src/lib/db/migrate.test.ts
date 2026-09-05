import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";
import { closeDatabase, getSqlite } from "@/lib/db";
import { runMigrations } from "@/lib/db/migrate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "drizzle");
// The real production data.db. Gitignored, local-only, and never written to
// — the test below extracts it to a fresh temp copy and only ever points
// DATABASE_URL at that copy, never at this path. Being gitignored means CI's
// checkout never has it, so the test that needs it is skipped there (see
// `it.skipIf` below) rather than failing on an environment difference that
// isn't a real bug. The "stops at first missing probe" test further down
// covers the same core baseline logic using only git-tracked fixtures, so
// this file's coverage isn't CI-only-degraded, just extra-verified locally.
const REAL_SNAPSHOT = path.join(REPO_ROOT, "grimoire-data.tar.gz");
const hasRealSnapshot = fs.existsSync(REAL_SNAPSHOT);

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grimoire-migrate-test-"));
});

afterEach(() => {
  closeDatabase();
  delete process.env.DATABASE_URL;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Points the app's lazy SQLite singleton at `dbPath`, closing any prior connection first. */
function useDb(dbPath: string): void {
  closeDatabase();
  process.env.DATABASE_URL = dbPath;
}

/**
 * Executes a real migration file's SQL directly against `sqlite`, exactly as
 * checked in under `drizzle/`. Used to build a synthetic "database frozen at
 * migration N" fixture from the real DDL rather than a hand-copied
 * approximation that could silently drift from the actual migration.
 */
function applyRawMigration(sqlite: Database.Database, tag: string): void {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    const trimmed = statement.trim();
    if (trimmed) sqlite.exec(trimmed);
  }
}

function tableNames(sqlite: Database.Database): string[] {
  return (
    sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as { name: string }[]
  ).map((r) => r.name);
}

function indexNames(sqlite: Database.Database, table: string): string[] {
  return (
    sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ?"
      )
      .all(table) as { name: string }[]
  ).map((r) => r.name);
}

function columnNames(sqlite: Database.Database, table: string): string[] {
  return (
    sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  ).map((c) => c.name);
}

function ledgerRows(
  sqlite: Database.Database
): { hash: string; created_at: number }[] {
  return sqlite
    .prepare(
      `SELECT hash, created_at FROM "__drizzle_migrations"
      ORDER BY created_at`
    )
    .all() as { hash: string; created_at: number }[];
}

// Exact `when` timestamps from drizzle/meta/_journal.json, asserted against
// directly below — if a migration is ever reordered or its journal entry
// regenerated, these assertions should fail loudly rather than silently
// checking the wrong migration.
const WHEN_0000 = 1780289053680;
const WHEN_0002 = 1780294431237;
const WHEN_0003 = 1785310767795;

/** Every migration tag in journal order, for building "frozen at N" fixtures. */
const TAGS = [
  "0000_dapper_psylocke",
  "0001_icy_wind_dancer",
  "0002_glamorous_gambit",
  "0003_modern_jazinda",
  "0004_many_imperial_guard",
] as const;

/**
 * The figures the two-dimension migration must not change. Each is computed
 * from the database itself, before and after, and compared to its own earlier
 * value — never to a literal. The production snapshot is real data in a public
 * repository, so a hard-coded expectation would be a leak as well as a test
 * that rots the moment the admin records anything.
 */
function measureInvariants(sqlite: Database.Database) {
  return {
    count: (
      sqlite.prepare("SELECT count(*) AS n FROM transactions").get() as {
        n: number;
      }
    ).n,
    total: (
      sqlite
        .prepare("SELECT coalesce(sum(amount), 0) AS n FROM transactions")
        .get() as { n: number }
    ).n,
    byMonth: sqlite
      .prepare(
        `SELECT substr(date, 1, 7) AS month, sum(amount) AS total
         FROM transactions GROUP BY 1 ORDER BY 1`
      )
      .all(),
    dates: (
      sqlite
        .prepare("SELECT DISTINCT date AS d FROM transactions ORDER BY 1")
        .all() as { d: string }[]
    ).map((r) => r.d),
  };
}

function countOf(sqlite: Database.Database, sql: string): number {
  return (sqlite.prepare(sql).get() as { n: number }).n;
}

/** Extracts the snapshot to this test's temp dir and returns the copy's path. */
function extractSnapshot(): string {
  execFileSync("tar", ["-xzf", REAL_SNAPSHOT, "-C", tmpDir]);
  const dbPath = path.join(tmpDir, "data.db");
  expect(fs.existsSync(dbPath)).toBe(true);
  return dbPath;
}

describe("runMigrations", () => {
  it("applies every migration to a brand-new empty database (positive control)", () => {
    const dbPath = path.join(tmpDir, "fresh.db");
    useDb(dbPath);

    runMigrations();

    const sqlite = getSqlite();
    expect(tableNames(sqlite)).toEqual(
      expect.arrayContaining([
        "purposes",
        "funding_sources",
        "share_links",
        "share_link_purposes",
        "transactions",
      ])
    );
    // The retired vocabulary is gone, and — the control that stops this from
    // passing on a database where everything is gone — the surviving tables
    // above are all present.
    expect(tableNames(sqlite)).not.toContain("categories");
    expect(tableNames(sqlite)).not.toContain("share_link_categories");

    // Flat by construction: neither dimension carries a parent column.
    expect(columnNames(sqlite, "purposes")).toEqual([
      "id",
      "name",
      "created_at",
    ]);
    expect(columnNames(sqlite, "funding_sources")).toEqual([
      "id",
      "name",
      "created_at",
    ]);
    expect(columnNames(sqlite, "transactions")).toEqual(
      expect.arrayContaining(["purpose_id", "funding_source_id"])
    );
    expect(columnNames(sqlite, "transactions")).not.toContain("category_id");
    expect(indexNames(sqlite, "transactions")).toEqual(
      expect.arrayContaining([
        "transactions_purpose_id_date_idx",
        "transactions_date_idx",
      ])
    );

    // A fresh database has nothing to baseline — every row in the ledger is
    // a migration drizzle actually ran, never the synthetic "baseline" hash.
    const ledger = ledgerRows(sqlite);
    expect(ledger).toHaveLength(TAGS.length);
    expect(ledger.every((row) => row.hash !== "baseline")).toBe(true);
  });

  it.skipIf(!hasRealSnapshot)(
    "baselines a real production snapshot frozen before 0003 and resumes cleanly",
    () => {
      const dbPath = extractSnapshot();

      // This snapshot already carries its own `__drizzle_migrations` ledger —
      // it isn't actually a legacy pre-ledger database. Drop the ledger to
      // simulate what a real db:push-era deployment looked like before the
      // migration system existed: real production schema and data, with the
      // ledger synthetically removed. This is what makes the test exercise
      // stampBaselineIfNeeded's probe walk rather than the normal resume path.
      const seed = new Database(dbPath);
      seed.exec(`DROP TABLE IF EXISTS "__drizzle_migrations"`);
      seed.close();

      // Confirm the fixture is actually "everything through 0002, nothing from
      // 0003" before trusting the assertions below — otherwise a change to
      // this snapshot could silently make the test pass for the wrong reason.
      const probe = new Database(dbPath, { readonly: true });
      const hasShareLinks = Boolean(
        probe
          .prepare(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='share_links'"
          )
          .get()
      );
      const hasDateIdx = Boolean(
        probe
          .prepare(
            "SELECT 1 FROM sqlite_master WHERE type='index' AND name='transactions_date_idx'"
          )
          .get()
      );
      probe.close();
      expect(hasShareLinks).toBe(true);
      expect(hasDateIdx).toBe(false);

      useDb(dbPath);
      runMigrations();

      const sqlite = getSqlite();
      expect(indexNames(sqlite, "transactions")).toContain(
        "transactions_date_idx"
      );
      expect(columnNames(sqlite, "transactions")).toContain(
        "funding_source_id"
      );

      const ledger = ledgerRows(sqlite);
      // The baseline stamp plus the two migrations (0003, 0004) that had not
      // been applied yet and therefore actually ran.
      expect(ledger).toHaveLength(3);
      expect(ledger[0].hash).toBe("baseline");
      expect(ledger[0].created_at).toBe(WHEN_0002);
    }
  );

  it("baselines a database sitting at the previous migration rather than replaying it", () => {
    const dbPath = path.join(tmpDir, "at-0003.db");
    useDb(dbPath);
    const sqlite = getSqlite();
    // Every migration up to and including 0003, from the real checked-in DDL,
    // with no ledger — the shape a db:push-era deployment has on the day 0004
    // ships. Replaying any of these would fail on "table already exists"; the
    // probe walk has to recognise them and stamp instead.
    for (const tag of TAGS.slice(0, 4)) applyRawMigration(sqlite, tag);
    // A row on each side of the rebuild, so "nothing was lost" is checkable
    // rather than vacuous.
    sqlite
      .prepare("INSERT INTO categories (id, name, parent_id) VALUES (?, ?, ?)")
      .run("pot-1", "Nguồn A", null);
    sqlite
      .prepare("INSERT INTO categories (id, name, parent_id) VALUES (?, ?, ?)")
      .run("leaf-1", "Mục X", "pot-1");
    sqlite
      .prepare(
        "INSERT INTO transactions (id, amount, note, date, category_id) VALUES (?, ?, ?, ?, ?)"
      )
      .run("txn-1", 13000, "", "2026-01-05T09:00", "leaf-1");
    closeDatabase();

    runMigrations();

    const migrated = getSqlite();
    const ledger = ledgerRows(migrated);
    expect(ledger[0].hash).toBe("baseline");
    expect(ledger[0].created_at).toBe(WHEN_0003);
    // Exactly one migration ran on top of the stamp: 0004 and nothing else.
    expect(ledger).toHaveLength(2);
    expect(ledger[1].hash).not.toBe("baseline");

    // 0004 really did run, and really did carry the row across.
    expect(tableNames(migrated)).not.toContain("categories");
    const row = migrated
      .prepare(
        `SELECT t.amount, p.name AS purpose, f.name AS funding
         FROM transactions t
         JOIN purposes p ON p.id = t.purpose_id
         JOIN funding_sources f ON f.id = t.funding_source_id
         WHERE t.id = 'txn-1'`
      )
      .get() as { amount: number; purpose: string; funding: string };
    expect(row).toEqual({
      amount: 13000,
      purpose: "Mục X",
      funding: "Nguồn A",
    });
    // Identity: the former root kept its id, the merged leaf did not.
    expect(
      countOf(
        migrated,
        "SELECT count(*) AS n FROM funding_sources WHERE id = 'pot-1'"
      )
    ).toBe(1);
    expect(
      countOf(
        migrated,
        "SELECT count(*) AS n FROM purposes WHERE id = 'leaf-1'"
      )
    ).toBe(0);
  });

  it("stops baselining at the first missing probe rather than skipping past it (negative control)", () => {
    const dbPath = path.join(tmpDir, "ancient.db");
    useDb(dbPath);
    const sqlite = getSqlite();
    // Real 0000 DDL, nothing more — no parent_id, no share_links, no
    // transactions_date_idx. If the probe walk skipped ahead instead of
    // stopping at the first false probe, migration 0001 would try to add a
    // column that already implicitly "existed" per a wrong baseline, or
    // 0002's DROP COLUMN would hit a column it never dropped from — either
    // way, this test would fail with a real SQLite error, not a silent bug.
    applyRawMigration(sqlite, "0000_dapper_psylocke");
    closeDatabase();

    runMigrations();

    const finalSqlite = getSqlite();
    const ledger = ledgerRows(finalSqlite);
    expect(ledger[0].hash).toBe("baseline");
    expect(ledger[0].created_at).toBe(WHEN_0000);

    // The full remaining chain (0001 → 0004) replayed correctly on top: the
    // tree was built up, then replaced by the two dimensions.
    expect(tableNames(finalSqlite)).toEqual(
      expect.arrayContaining(["purposes", "funding_sources", "share_links"])
    );
    expect(tableNames(finalSqlite)).not.toContain("categories");
    expect(columnNames(finalSqlite, "transactions")).toEqual(
      expect.arrayContaining(["purpose_id", "funding_source_id"])
    );
    expect(indexNames(finalSqlite, "transactions")).toContain(
      "transactions_date_idx"
    );
  });

  it.skipIf(!hasRealSnapshot)(
    "preserves measured invariants when migrating a copy of a real database",
    () => {
      const dbPath = extractSnapshot();

      // Measured on a separate read-only handle before the app's own
      // connection ever opens the copy, so nothing here can be an artefact of
      // the migration having already run.
      const source = new Database(dbPath, { readonly: true });
      const before = measureInvariants(source);
      const rootCount = countOf(
        source,
        "SELECT count(*) AS n FROM categories WHERE parent_id IS NULL"
      );
      // The migration's own rule: a leaf below a root, or anything holding
      // transactions. On any database where the old leaf-only rule held —
      // which is every database the application itself produced — this is
      // exactly "distinct leaf names".
      const distinctLeafNames = countOf(
        source,
        `SELECT count(DISTINCT name) AS n FROM categories c
         WHERE (
             c.parent_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM categories x WHERE x.parent_id = c.id)
           )
           OR EXISTS (SELECT 1 FROM transactions t WHERE t.category_id = c.id)`
      );
      const shareLinkCount = countOf(
        source,
        "SELECT count(*) AS n FROM share_links"
      );
      source.close();

      // The whole comparison is worthless against an empty database, so say
      // out loud that there was something to preserve.
      expect(before.count).toBeGreaterThan(0);
      expect(before.total).toBeGreaterThan(0);
      expect(before.byMonth.length).toBeGreaterThan(0);
      expect(rootCount).toBeGreaterThan(0);
      expect(distinctLeafNames).toBeGreaterThan(0);

      useDb(dbPath);
      runMigrations();
      const migrated = getSqlite();

      // Every figure compared to the same figure taken beforehand — never to a
      // literal, which in a public repository would be a leak as well as a
      // test that breaks the next time the admin records anything.
      expect(measureInvariants(migrated)).toEqual(before);

      // Shape: one Purpose per distinct leaf name, one Funding Source per
      // former root, and every transaction pointing at both.
      expect(countOf(migrated, "SELECT count(*) AS n FROM purposes")).toBe(
        distinctLeafNames
      );
      expect(
        countOf(migrated, "SELECT count(*) AS n FROM funding_sources")
      ).toBe(rootCount);
      expect(
        countOf(
          migrated,
          `SELECT count(*) AS n FROM transactions
           WHERE purpose_id IS NULL OR funding_source_id IS NULL`
        )
      ).toBe(0);
      // ...and pointing at rows that exist. `foreign_key_check` returns one
      // row per violation, so an empty result is the assertion.
      expect(migrated.pragma("foreign_key_check")).toEqual([]);

      // The retired tables are gone, paired with the control that the tables
      // which must survive did: a migration that dropped everything would
      // satisfy the "absent" half on its own.
      expect(tableNames(migrated)).not.toContain("categories");
      expect(tableNames(migrated)).not.toContain("share_link_categories");
      expect(tableNames(migrated)).toEqual(
        expect.arrayContaining([
          "transactions",
          "purposes",
          "funding_sources",
          "share_links",
          "share_link_purposes",
        ])
      );

      // The link that already existed still resolves, and still has a scope.
      expect(countOf(migrated, "SELECT count(*) AS n FROM share_links")).toBe(
        shareLinkCount
      );
      expect(
        countOf(migrated, "SELECT count(*) AS n FROM share_link_purposes")
      ).toBeGreaterThan(0);

      // Merged Purposes carry fresh UUIDv7 ids: version nibble 7, variant
      // 8/9/a/b. Former roots keep theirs, which is asserted in the
      // baselining test above against an invented fixture.
      const purposeIds = (
        migrated.prepare("SELECT id FROM purposes").all() as { id: string }[]
      ).map((r) => r.id);
      expect(purposeIds.length).toBeGreaterThan(0);
      for (const id of purposeIds) {
        expect(id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
        );
      }
    }
  );

  it("re-baselines a fully migrated database that has lost its ledger, instead of replaying 0000 onto it", () => {
    // Dropping `__drizzle_migrations` is the documented way to re-baseline a
    // database, and `db:push` produces the same shape: current schema, no
    // ledger. Before the probes were made drop-proof this took the
    // "brand-new database" path and replayed 0000 over a populated schema,
    // which dies on `table transactions already exists` — at startup, since
    // instrumentation calls runMigrations().
    const dbPath = path.join(tmpDir, "ledgerless.db");
    useDb(dbPath);
    runMigrations();

    const seeded = getSqlite();
    seeded
      .prepare("INSERT INTO funding_sources (id, name) VALUES (?, ?)")
      .run("pot-1", "Nguồn A");
    seeded
      .prepare("INSERT INTO purposes (id, name) VALUES (?, ?)")
      .run("purpose-1", "Mục X");
    seeded
      .prepare(
        `INSERT INTO transactions (id, amount, note, date, purpose_id, funding_source_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run("txn-1", 17000, "", "2026-02-02T09:00", "purpose-1", "pot-1");
    seeded.exec(`DROP TABLE "__drizzle_migrations"`);
    closeDatabase();

    expect(() => runMigrations()).not.toThrow();

    const after = getSqlite();
    // Stamped, not replayed: one baseline row at the newest migration and
    // nothing run on top of it.
    const ledger = ledgerRows(after);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].hash).toBe("baseline");

    // The control that makes "it didn't throw" mean something — the data is
    // still there and still joins across both dimensions.
    expect(
      after
        .prepare(
          `SELECT t.amount, p.name AS purpose, f.name AS funding
           FROM transactions t
           JOIN purposes p ON p.id = t.purpose_id
           JOIN funding_sources f ON f.id = t.funding_source_id
           WHERE t.id = 'txn-1'`
        )
        .get()
    ).toEqual({ amount: 17000, purpose: "Mục X", funding: "Nguồn A" });
  });

  it("gives a childless pot a Funding Source but no Purpose, unless it was spent from directly", () => {
    const dbPath = path.join(tmpDir, "childless-roots.db");
    useDb(dbPath);
    const sqlite = getSqlite();
    for (const tag of TAGS.slice(0, 4)) applyRawMigration(sqlite, tag);

    const addCategory = sqlite.prepare(
      "INSERT INTO categories (id, name, parent_id) VALUES (?, ?, ?)"
    );
    // A pot created and never spent from.
    addCategory.run("pot-unused", "Nguồn chưa dùng", null);
    // A pot spent from directly — legal under the old leaf-only rule, since a
    // childless root is its own leaf.
    addCategory.run("pot-direct", "Nguồn dùng thẳng", null);
    sqlite
      .prepare(
        "INSERT INTO transactions (id, amount, note, date, category_id) VALUES (?, ?, ?, ?, ?)"
      )
      .run("txn-direct", 19000, "", "2026-03-03T09:00", "pot-direct");
    closeDatabase();

    runMigrations();
    const migrated = getSqlite();

    // Both are pots...
    expect(
      (
        migrated
          .prepare("SELECT name FROM funding_sources ORDER BY name")
          .all() as {
          name: string;
        }[]
      ).map((r) => r.name)
    ).toEqual(["Nguồn chưa dùng", "Nguồn dùng thẳng"]);

    // ...but only the one actually spent from is also a Purpose. Minting one
    // for the unused pot would invent a spending purpose never recorded.
    expect(
      (
        migrated.prepare("SELECT name FROM purposes").all() as {
          name: string;
        }[]
      ).map((r) => r.name)
    ).toEqual(["Nguồn dùng thẳng"]);

    // And its transaction survived, pointing at both.
    expect(
      migrated
        .prepare(
          `SELECT purpose_id IS NOT NULL AS p, funding_source_id = 'pot-direct' AS f
           FROM transactions WHERE id = 'txn-direct'`
        )
        .get()
    ).toEqual({ p: 1, f: 1 });
  });
});
