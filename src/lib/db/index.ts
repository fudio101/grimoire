import "@tanstack/react-start/server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const globalRef = globalThis as typeof globalThis & {
  __grimoireSqlite?: Database.Database;
};

function open(): Database.Database {
  const connection = new Database(process.env.DATABASE_URL ?? "./data.db");
  connection.pragma("busy_timeout = 5000");
  enableWalMode(connection);
  return connection;
}

/**
 * Cached on globalThis because Vite's SSR module runner re-evaluates this
 * module on every HMR invalidation. Without the cache each cycle would open a
 * new connection and leak the previous one — file descriptors first, then
 * SQLITE_BUSY against our own stale connections, with the retry loop below
 * masking the symptom long enough to make it hard to diagnose.
 */
const sqlite = (globalRef.__grimoireSqlite ??= open());

export const db = drizzle(sqlite, { schema });
export { sqlite };

/**
 * Switch the connection to WAL journal mode, retrying on SQLITE_BUSY.
 *
 * Switching journal_mode needs a brief exclusive lock and fails immediately
 * with SQLITE_BUSY (the busy_timeout handler does not cover this case) when
 * another connection to the same file is doing the same thing. The original
 * trigger was parallel Next.js build workers; `vite build` never evaluates
 * this module, so that case is gone. Kept because a second container sharing
 * the same volume still hits it. WAL is a persistent property of the file, so
 * once any process sets it the rest only need to observe it — retry briefly,
 * and treat "already in WAL" as success.
 */
function enableWalMode(db: Database.Database, attempts = 10, delayMs = 100) {
  for (let i = 0; i < attempts; i++) {
    try {
      // A completed pragma is authoritative: it returns "wal" on success, or
      // another mode when WAL is unsupported here (e.g. an in-memory db).
      // Neither changes on retry — only a thrown SQLITE_BUSY is worth retrying.
      db.pragma("journal_mode = WAL");
      return;
    } catch (err) {
      if (!isBusyError(err) || i === attempts - 1) throw err;
    }
    sleepSync(delayMs);
  }
}

function isBusyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "SQLITE_BUSY"
  );
}

/** Synchronous sleep — better-sqlite3 is synchronous, so we cannot await here. */
function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
