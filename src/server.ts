import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { runMigrations } from "@/lib/db/migrate";
import { assertAuthSecret } from "@/lib/auth";
import { sqlite } from "@/lib/db";

// Replaces the App Router's instrumentation.register() hook. This module is
// compiled only into the SSR environment and evaluated once, when the server
// bundle loads — so these run exactly once, before the first request.
assertAuthSecret();
runMigrations();

/**
 * Close SQLite on shutdown.
 *
 * `srvx --prod` runs the server in-process rather than forking (see the `prod
 * && !import` branch in its CLI), so node is PID 1 in the container and SIGTERM
 * from `docker stop` lands here. srvx installs handlers for uncaughtException
 * and unhandledRejection but none for signals, so without this node takes its
 * default action — immediate death, with the database never closed.
 *
 * Nothing committed is at risk either way: better-sqlite3 is synchronous and
 * SQLite's default `synchronous=FULL` fsyncs each commit into the WAL, which is
 * replayed on the next open. What closing buys is a checkpointed, truncated WAL
 * and a clean open next boot instead of a recovery pass.
 *
 * Guarded because SIGINT and SIGTERM can both arrive, and `close()` on an
 * already-closed connection throws.
 */
let closed = false;
function shutdown(signal: NodeJS.Signals): void {
  if (closed) return;
  closed = true;
  try {
    sqlite.close();
  } catch (err) {
    console.error("Error closing the database during shutdown:", err);
  }
  // 128 + signal number, the conventional exit code for death by signal.
  process.exit(signal === "SIGINT" ? 130 : 143);
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

export default createServerEntry({
  fetch: (request) => handler.fetch(request),
});
