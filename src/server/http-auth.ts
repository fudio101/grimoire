import "server-only";
import { requireAuth, UnauthorizedError } from "@/server/auth-guard";

/**
 * Origin/Host check for Route Handler reads, mirroring what Next's own
 * Server Action handler does internally for POSTs — a GET Route Handler
 * gets no such protection automatically. SameSite=Lax already blocks the
 * session cookie on a cross-origin fetch()/XHR (Lax only forwards it on a
 * top-level GET navigation), so this is defense in depth on top of that,
 * not the only thing standing between a private endpoint and a cross-site
 * request.
 */
function originIsTrusted(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Auth + origin gate for a private Route Handler GET. Returns a Response to
 * send immediately when the request is rejected, or null to continue.
 */
export async function guardApiRequest(
  request: Request
): Promise<Response | null> {
  if (!originIsTrusted(request)) {
    return Response.json({ error: "Origin không hợp lệ." }, { status: 403 });
  }
  try {
    await requireAuth();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    throw err;
  }
  return null;
}
