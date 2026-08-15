import "server-only";
import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
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
 * Opened lazily, on first use, rather than at module-evaluation time.
 *
 * `next build` evaluates every page module while collecting page data — no
 * `dynamic` export exempts a module from being *imported*, only from being
 * *prerendered* — so an eager `open()` here would create (and never close) a
 * `data.db` inside the build step. Lazy opening means importing this module is
 * free; only an actual query touches the filesystem.
 *
 * The `globalThis` cache stays for a second reason: it is the standard
 * `next dev` HMR-singleton idiom too — without it, every module reload during
 * development would open a new connection and leak the previous one, file
 * descriptors first, then SQLITE_BUSY against our own stale connections.
 */
function getSqlite(): Database.Database {
  return (globalRef.__grimoireSqlite ??= open());
}

let drizzleInstance: BetterSQLite3Database<typeof schema> | undefined;

function getDrizzle(): BetterSQLite3Database<typeof schema> {
  return (drizzleInstance ??= drizzle(getSqlite(), { schema }));
}

/**
 * Proxied so every existing `db.select()` / `db.insert()` / `db.transaction()`
 * call site keeps working unchanged, while the real drizzle instance (and the
 * SQLite connection underneath it) is only constructed on first use.
 */
export const db: BetterSQLite3Database<typeof schema> = new Proxy(
  {} as BetterSQLite3Database<typeof schema>,
  {
    get(_target, prop) {
      const instance = getDrizzle();
      // Pass `instance` as the receiver, not the trap's own — any accessor
      // property on drizzle's instance must see the real object as `this`,
      // never this Proxy.
      const value = Reflect.get(instance, prop, instance);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  }
);

export { getSqlite };

/**
 * Close the underlying connection. Idempotent: `close()` on an already-closed
 * connection throws, and shutdown can be asked to run more than once.
 */
export function closeDatabase(): void {
  if (!globalRef.__grimoireSqlite) return;
  try {
    globalRef.__grimoireSqlite.close();
  } finally {
    globalRef.__grimoireSqlite = undefined;
    drizzleInstance = undefined;
  }
}

/**
 * Switch the connection to WAL journal mode, retrying on SQLITE_BUSY.
 *
 * Switching journal_mode needs a brief exclusive lock and fails immediately
 * with SQLITE_BUSY (the busy_timeout handler does not cover this case) when
 * another connection to the same file is doing the same thing — parallel
 * build-time module evaluation opening the database is exactly this case, so
 * this retry loop is load-bearing again once the app builds under Next rather
 * than Vite. WAL is a persistent property of the file, so once any process
 * sets it the rest only need to observe it — retry briefly, and treat "already
 * in WAL" as success.
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
