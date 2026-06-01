import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "@/lib/db";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

type JournalEntry = { idx: number; when: number; tag: string };

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
    sqlite
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name)
  );
}

function columnExists(table: string, column: string): boolean {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as {
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
  sqlite.exec(
    `CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )`
  );

  const tracked = sqlite
    .prepare(`SELECT count(*) AS n FROM "__drizzle_migrations"`)
    .get() as { n: number };
  if (tracked.n > 0) return; // already managed by the migrator

  // Fresh database → let the migrator create everything from 0000.
  if (!tableExists("categories")) return;

  // Pre-migration database. Mark applied up to the latest migration whose
  // schema change is already present, so only genuinely missing ones run.
  // The migrator only compares `created_at`, so a placeholder hash is fine.
  const lastApplied = columnExists("categories", "parent_id")
    ? entries[entries.length - 1] // schema already current → skip all
    : entries[0]; // only baseline present → run the parent_id migration

  sqlite
    .prepare(
      `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)`
    )
    .run("baseline", lastApplied.when);
}
