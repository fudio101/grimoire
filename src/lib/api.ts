export class ApiUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "ApiUnauthorizedError";
  }
}

function toSearchParams(params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) usp.set(key, value);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Shared client for every Route Handler read. Only ever called from the
 * browser: `query-options.ts`'s `queryFn`s run there exclusively — RSC pages
 * prefetch by calling the underlying `lib/db/queries.ts` / `server/*.queries.ts`
 * function directly instead of going through this, since a Server Component
 * calling this would be a self-fetch back to the same server rather than a
 * plain function call.
 */
export async function fetchJson<T>(
  path: string,
  params: Record<string, string | undefined> = {}
): Promise<T> {
  const res = await fetch(`${path}${toSearchParams(params)}`);
  if (res.status === 401) throw new ApiUnauthorizedError();
  if (!res.ok) {
    throw new Error(`${path} responded with ${res.status}`);
  }
  return res.json() as Promise<T>;
}
