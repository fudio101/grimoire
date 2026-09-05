import { getSqlite } from "@/lib/db";

/**
 * Deliberately unauthenticated — the second public surface after
 * `/api/public-report`, and for a different reason: a healthcheck that needs a
 * session cannot be run by the thing that has to run it. Docker's `HEALTHCHECK`
 * executes inside the container with no cookie jar, and neither Traefik nor
 * `cloudflared` can hold one either.
 *
 * The response is therefore kept deliberately contentless: `{ ok: true }` and
 * nothing else. No version, no database path, no config — a monitor only needs
 * to know whether to restart the container, and every extra field is a
 * reconnaissance detail handed to anyone who reaches the endpoint through the
 * public hostname.
 */

/**
 * Verified redundant under Next 16.3, and kept anyway: a build with this line
 * removed still reports `/api/health` as `ƒ (Dynamic)` and still leaves no
 * `data.db` behind, because route handlers are dynamic by default now.
 *
 * It stays because this is the only handler in the app with no dynamic API in
 * it — every other one reads `request.url` and is therefore dynamic by
 * accident rather than by intent. If that default ever moves back, this
 * handler is the single one that would start executing its query during
 * `next build` and open the database there. The Dockerfile's
 * `test ! -f data.db` would catch that, so this line is insurance on top of a
 * control, not the control itself.
 */
export const dynamic = "force-dynamic";

export function GET() {
  try {
    // A real round-trip to SQLite, not just a liveness ping: the failure worth
    // restarting for is a process that still accepts connections while its
    // database handle is gone (a deleted or unmounted volume, a closed
    // connection after a botched shutdown). `SELECT 1` is served from memory
    // once the file is open, so this costs nothing on a healthy container.
    getSqlite().prepare("select 1").get();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json({ ok: false }, { status: 503 });
  }
}
