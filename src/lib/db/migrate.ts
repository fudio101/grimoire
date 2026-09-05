import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, getSqlite } from "@/lib/db";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

type JournalEntry = { idx: number; when: number; tag: string };

/**
 * Detects whether a migration's schema change is already present in a
 * pre-ledger database. Used to baseline legacy DBs at the correct point.
 *
 * WHEN ADDING A MIGRATION: add a probe keyed by its tag that returns true once
 * that migration's schema change exists. Baselining walks these in journal
 * order and stops at the first missing one, so an absent or stale probe causes
 * legacy databases to either replay or skip migrations incorrectly.
 */
const SCHEMA_PROBES: Record<string, () => boolean> = {
  "0000_dapper_psylocke": () => tableExists("categories"),
  "0001_icy_wind_dancer": () => columnExists("categories", "parent_id"),
  /**
   * 0002 both creates share_links and drops categories.is_public/share_token,
   * so it is tempting to probe for both halves. Don't: baselining is
   * all-or-nothing per migration, and a probe that answers false because only
   * the drops are missing makes the migrator *replay* the migration, which
   * dies on "table share_link_categories already exists" and takes the server
   * down at startup. Probe the half whose replay is fatal.
   */
  "0002_glamorous_gambit": () => tableExists("share_links"),
  "0003_modern_jazinda": () => indexExists("transactions_date_idx"),
  /**
   * 0004 replaces the category tree with the two dimensions. Probe the funding
   * column rather than the `purposes` table: the two arrive together today, but
   * the column is the half whose absence means the transactions rebuild has not
   * happened, and the rebuild is the half whose replay is fatal.
   */
  "0004_many_imperial_guard": () =>
    columnExists("transactions", "funding_source_id"),
};

/**
 * Apply pending Drizzle migrations on startup.
 *
 * Existing deployments predate the migration system (their tables were created
 * by `db:push`, with no `__drizzle_migrations` ledger). Running the migrator
 * blindly against them would replay `0000` (CREATE TABLE) and fail with
 * "table already exists", or replay an already-applied ALTER and fail with
 * "duplicate column". To avoid that, we stamp such databases as already being
 * at the right baseline before handing off to the migrator.
 */
export function runMigrations(): void {
  if (!fs.existsSync(MIGRATIONS_DIR)) return;

  stampBaselineIfNeeded();
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}

function tableExists(name: string): boolean {
  return Boolean(
    getSqlite()
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name)
  );
}

function indexExists(name: string): boolean {
  return Boolean(
    getSqlite()
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?")
      .get(name)
  );
}

function columnExists(table: string, column: string): boolean {
  const cols = getSqlite().prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return cols.some((c) => c.name === column);
}

function readJournalEntries(): JournalEntry[] {
  const journalPath = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: JournalEntry[];
  };
  return [...journal.entries].sort((a, b) => a.when - b.when);
}

function stampBaselineIfNeeded(): void {
  const entries = readJournalEntries();
  if (entries.length === 0) return;

  // Same DDL the Drizzle migrator uses, so it reuses this table as-is.
  getSqlite().exec(
    `CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )`
  );

  const tracked = getSqlite()
    .prepare(`SELECT count(*) AS n FROM "__drizzle_migrations"`)
    .get() as { n: number };
  if (tracked.n > 0) return; // already managed by the migrator

  // Fresh database → let the migrator create everything from 0000.
  //
  // `categories` is the sentinel even though 0004 drops it: a pre-ledger
  // database predates 0004 by definition, so it always still has the table,
  // and anything that has been through 0004 was managed by the migrator and
  // already returned above on a non-empty ledger.
  if (!tableExists("categories")) return;

  // Pre-migration database. Walk migrations in journal order and stamp the
  // ledger at the last one whose schema change is already present, so only
  // genuinely missing migrations run. Stop at the first absent/unknown probe.
  // The migrator only compares `created_at`, so a placeholder hash is fine.
  let lastApplied: JournalEntry | undefined;
  for (const entry of entries) {
    const probe = SCHEMA_PROBES[entry.tag];
    if (!probe || !probe()) break;
    lastApplied = entry;
  }

  // Baseline schema unrecognizable → let the migrator run everything.
  if (!lastApplied) return;

  getSqlite()
    .prepare(
      `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)`
    )
    .run("baseline", lastApplied.when);
}
