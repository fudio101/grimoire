/**
 * Replaces `src/server.ts`. Next calls `register()` once, before the server
 * starts handling requests — Next itself already skips this during
 * `next build` (`NEXT_PHASE === "phase-production-build"`), so migrations
 * never run at build time. `test ! -f data.db` after the build (this repo's
 * own CI, and again in PR 10's Docker build) is the positive control for that
 * claim — a build that silently opened SQLite looks identical to one that
 * didn't until you check.
 *
 * The actual Node-only logic lives in `instrumentation.node.ts`, dynamically
 * imported only under the Node runtime check below. Next builds an Edge
 * bundle of this file too (in case a project needs Edge-safe instrumentation),
 * and a `process.on`/`process.exit` call written directly in *this* file gets
 * flagged even though it is unreachable at runtime — the bundler can't see
 * that far. Splitting the Node-only code into its own file, imported only
 * behind this guard, is Next's own documented pattern for exactly this case:
 * https://nextjs.org/docs/app/guides/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
