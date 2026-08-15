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

describe("runMigrations", () => {
  it("applies every migration to a brand-new empty database (positive control)", () => {
    const dbPath = path.join(tmpDir, "fresh.db");
    useDb(dbPath);

    runMigrations();

    const sqlite = getSqlite();
    expect(tableNames(sqlite)).toEqual(
      expect.arrayContaining([
        "categories",
        "share_links",
        "share_link_categories",
        "transactions",
      ])
    );
    expect(columnNames(sqlite, "categories")).toContain("parent_id");
    expect(indexNames(sqlite, "transactions")).toEqual(
      expect.arrayContaining([
        "transactions_category_id_date_idx",
        "transactions_date_idx",
      ])
    );

    // A fresh database has nothing to baseline — every row in the ledger is
    // a migration drizzle actually ran, never the synthetic "baseline" hash.
    const ledger = ledgerRows(sqlite);
    expect(ledger).toHaveLength(4);
    expect(ledger.every((row) => row.hash !== "baseline")).toBe(true);
  });

  it.skipIf(!hasRealSnapshot)(
    "baselines a real production snapshot frozen before 0003 and resumes cleanly",
    () => {
      execFileSync("tar", ["-xzf", REAL_SNAPSHOT, "-C", tmpDir]);
      const dbPath = path.join(tmpDir, "data.db");
      expect(fs.existsSync(dbPath)).toBe(true);

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

      const ledger = ledgerRows(sqlite);
      expect(ledger).toHaveLength(2); // the baseline stamp + the one migration (0003) that actually ran
      expect(ledger[0].hash).toBe("baseline");
      expect(ledger[0].created_at).toBe(WHEN_0002);
    }
  );

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

    // The full remaining chain (0001 → 0003) replayed correctly on top.
    const cols = columnNames(finalSqlite, "categories");
    expect(cols).toContain("parent_id");
    expect(cols).not.toContain("share_token");
    expect(indexNames(finalSqlite, "transactions")).toContain(
      "transactions_date_idx"
    );
  });
});
