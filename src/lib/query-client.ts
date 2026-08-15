import { QueryClient, environmentManager } from "@tanstack/react-query";

/**
 * Replaces `router.tsx`'s per-request `new QueryClient()` in `getRouter()`.
 * Same reasoning, same `staleTime`: a server-side client must be fresh per
 * request (a module-scope one would leak cached data between visitors), while
 * the browser needs exactly one instance for its whole lifetime — recreating
 * it on every render would drop the cache React just hydrated.
 *
 * `staleTime: 60_000` matches `router.tsx:11` and is what makes a previously
 * visited month/filter render instantly with zero network requests instead of
 * refetching on every revisit.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }
  return (browserQueryClient ??= makeQueryClient());
}
