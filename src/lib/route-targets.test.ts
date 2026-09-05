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

/**
 * Internal redirect destinations from `next.config.ts`.
 *
 * The same unchecked-string problem one layer out: a `destination` is a plain
 * string that neither the compiler nor Next's route table validates, so a
 * redirect can outlive the route it points at. `/dashboard/manage` — the
 * destination of the "Quản lý" nav tab — kept pointing at the deleted
 * `.../categories` for exactly that reason, 404ing the main navigation while
 * every check in the repository stayed green.
 */
function redirectDestinations(): string[] {
  const source = fs.readFileSync(
    path.join(SRC, "..", "next.config.ts"),
    "utf8"
  );
  return [...source.matchAll(/destination:\s*"(\/[^"]*)"/g)].map((m) => m[1]);
}

/** Whether a path resolves to a page or a route handler under `src/app`. */
function resolvesToARoute(routePath: string): boolean {
  const base = path.join(SRC, "app", routePath);
  return (
    fs.existsSync(path.join(base, "page.tsx")) ||
    fs.existsSync(path.join(base, "route.ts"))
  );
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

describe("next.config.ts redirect destinations", () => {
  it("finds the destinations at all (control for the regex below)", () => {
    const destinations = redirectDestinations();
    expect(destinations.length).toBeGreaterThanOrEqual(4);
  });

  it("points every redirect at a route that exists", () => {
    const dangling = redirectDestinations().filter(
      (destination) => !resolvesToARoute(destination)
    );
    expect(dangling).toEqual([]);
  });

  it("would notice a destination that does not exist (negative control)", () => {
    // The check above only means something if it can fail.
    expect(resolvesToARoute("/dashboard/manage/categories")).toBe(false);
    expect(resolvesToARoute("/dashboard/manage/purposes")).toBe(true);
  });
});
