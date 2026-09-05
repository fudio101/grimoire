import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "..");

/**
 * Every route path `query-options.ts` fetches, as it literally spells them.
 *
 * These are plain strings inside `fetchJson(...)` calls, so nothing in the
 * type system connects them to the files under `src/app/api/`. Renaming a
 * route — which #135 did, moving `/api/categories` to `/api/purposes` — leaves
 * the string behind with no error anywhere: `tsc` sees a valid string, lint
 * sees a valid string, and the dashboard still renders, because an RSC page's
 * prefetch calls the query function directly rather than through the route.
 * Only the client-side refetch 404s, which presents as a hydration bug.
 */
function fetchedApiPaths(): string[] {
  const source = fs.readFileSync(
    path.join(SRC, "lib", "query-options.ts"),
    "utf8"
  );
  return [...source.matchAll(/fetchJson<[^>]*>\(\s*"(\/api\/[^"]+)"/g)].map(
    (m) => m[1]
  );
}

function routeFileFor(apiPath: string): string {
  return path.join(SRC, "app", apiPath, "route.ts");
}

describe("query-options route paths", () => {
  it("finds the fetched paths at all (control for the regex below)", () => {
    const paths = fetchedApiPaths();
    // If the shape of the file changes so the regex stops matching, every
    // assertion below would pass vacuously. This is what stops that.
    expect(paths.length).toBeGreaterThanOrEqual(6);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("resolves every fetched path to a real Route Handler", () => {
    const missing = fetchedApiPaths().filter(
      (apiPath) => !fs.existsSync(routeFileFor(apiPath))
    );
    expect(missing).toEqual([]);
  });

  it("would notice a path that does not exist (negative control)", () => {
    // The check above only means something if it can fail. A route that was
    // deliberately removed must not resolve.
    expect(fs.existsSync(routeFileFor("/api/categories"))).toBe(false);
    expect(fs.existsSync(routeFileFor("/api/recent-categories"))).toBe(false);
    // ...while the ones that replaced them do.
    expect(fs.existsSync(routeFileFor("/api/purposes"))).toBe(true);
    expect(fs.existsSync(routeFileFor("/api/recent-purposes"))).toBe(true);
  });
});
