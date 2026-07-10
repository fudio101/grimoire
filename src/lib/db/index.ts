import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(process.env.DATABASE_URL ?? "./data.db");
sqlite.pragma("busy_timeout = 5000");
enableWalMode(sqlite);

export const db = drizzle(sqlite, { schema });
export { sqlite };

/**
 * Switch the connection to WAL journal mode, retrying on SQLITE_BUSY.
 *
 * Switching journal_mode needs a brief exclusive lock and fails immediately
 * with SQLITE_BUSY (the busy_timeout handler does not cover this case) when
 * another connection to the same file is doing the same thing. This happens
 * when parallel Next.js build workers all import this module and open the same
 * database at once. WAL is a persistent property of the file, so once any
 * worker sets it the rest only need to observe it — retry briefly, and treat
 * "already in WAL" as success.
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
