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
  /**
   * A probe has to stay true once its migration is applied, *forever* — the
   * walk below stops at the first false one, so a probe that later goes back
   * to false makes a database look older than it is and replays everything
   * from 0000 on top of a populated schema.
   *
   * That is why 0000 is probed through `transactions` rather than through
   * `categories`, which it also creates: 0004 drops `categories`, and probing
   * for it would have made every post-0004 database with no ledger look
   * brand-new. `transactions` is created by 0000 and never dropped — 0004
   * rebuilds it in place, which is a different thing.
   */
  "0000_dapper_psylocke": () => tableExists("transactions"),
  /**
   * Same hazard one migration later: `categories.parent_id` cannot be observed
   * once 0004 has taken the table away, so "the table is gone" counts as
   * having got past this point.
   */
  "0001_icy_wind_dancer": () =>
    columnExists("categories", "parent_id") || !tableExists("categories"),
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
  // `transactions` is the sentinel because it is the one table every version
  // of this schema has had. `categories` used to serve here and can no longer:
  // after 0004 it is gone, so an existing database that has lost its ledger —
  // through `db:push`, or through dropping the ledger deliberately to
  // re-baseline — would have been mistaken for an empty one and had 0000
  // replayed on top of it, which dies on "table transactions already exists"
  // at startup.
  if (!tableExists("transactions")) return;

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
