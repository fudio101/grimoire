import { assertAuthSecret } from "@/lib/auth";
import { runMigrations } from "@/lib/db/migrate";
import { closeDatabase } from "@/lib/db";

// Runs once, as a module side effect, the first (and only) time
// instrumentation.ts dynamically imports this file.
assertAuthSecret();
runMigrations();

/**
 * Close SQLite on shutdown.
 *
 * `node server.js` (the standalone output's own entry, see PR 10) is PID 1 in
 * the container, so SIGTERM from `docker stop` lands here directly — nothing
 * else installs a handler for it. better-sqlite3 is synchronous and SQLite's
 * default `synchronous=FULL` fsyncs each commit into the WAL, which is
 * replayed on the next open, so nothing committed is at risk either way. What
 * closing buys is a checkpointed, truncated WAL and a clean open next boot
 * instead of a recovery pass.
 *
 * `process.on("exit", ...)` rather than doing the close directly in the
 * SIGTERM/SIGINT handlers: `exit` always fires and `close()` is synchronous,
 * so it's legal there, and it doesn't risk racing whatever handler Next's own
 * server installs for the signals themselves. The signal handlers below just
 * convert the signal into an `exit`, since Node does not exit on SIGTERM/
 * SIGINT by default once any listener is attached to them.
 */
let closed = false;
process.on("exit", () => {
  if (closed) return;
  closed = true;
  try {
    closeDatabase();
  } catch (err) {
    console.error("Error closing the database during shutdown:", err);
  }
});
process.once("SIGTERM", () => process.exit(143));
process.once("SIGINT", () => process.exit(130));
