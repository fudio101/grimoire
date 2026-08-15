import {
  QueryCache,
  QueryClient,
  environmentManager,
} from "@tanstack/react-query";
import { ApiUnauthorizedError } from "@/lib/api";

/**
 * A server-side client must be fresh per request (a module-scope one would
 * leak cached data between visitors), while the browser needs exactly one
 * instance for its whole lifetime — recreating it on every render would drop
 * the cache React just hydrated.
 *
 * `staleTime: 60_000` is what makes a previously visited month/filter render
 * instantly with zero network requests instead of refetching on every
 * revisit.
 *
 * `retry` stops immediately on `ApiUnauthorizedError` rather than the default
 * 3 attempts with backoff — without it, an expired session would retry three
 * times before the `onError` below ever got a chance to redirect anywhere,
 * turning a session expiry into several seconds of visible nothing.
 *
 * `onError` on the cache, not on individual queries: a session can expire
 * behind any of them. A full-page navigation to `/login`, not `next/navigation`,
 * is deliberate — it also discards this QueryClient and every other piece of
 * client memory, which is the right amount of reset for an auth loss, not
 * just the convenient one.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: (failureCount, error) =>
          error instanceof ApiUnauthorizedError ? false : failureCount < 3,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (
          error instanceof ApiUnauthorizedError &&
          typeof window !== "undefined"
        ) {
          window.location.assign("/login");
        }
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }
  return (browserQueryClient ??= makeQueryClient());
}
