import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach } from "vitest";
import { closeDatabase } from "@/lib/db";
import { runMigrations } from "@/lib/db/migrate";

/**
 * Point the application's own database singleton at a throwaway SQLite file
 * for the duration of a `describe`, migrate it, and seed it.
 *
 * Every test that touches data drives the real connection rather than a mock,
 * which is what makes an assertion about a query or an action mean anything:
 * the SQL, the foreign keys and the migrations are all in play. The file lives
 * in a fresh temp directory per test, so nothing leaks between them and the
 * developer's own `data.db` is never opened — `DATABASE_URL` is set before the
 * lazy connection can be created and deleted again afterwards.
 *
 * `closeDatabase()` runs both before and after: `src/lib/db/index.ts` caches
 * its connection on `globalThis`, which survives across test files in a shared
 * worker, so an earlier file's connection has to be dropped before this one's
 * `DATABASE_URL` can take effect.
 *
 * Named `with...` rather than `use...` because `react-hooks/rules-of-hooks`
 * reads any top-level `useX()` call as a misplaced React hook and fails lint.
 */
export function withTempDatabase(
  label: string,
  seed?: () => Promise<void> | void
): void {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `grimoire-${label}-`));
    closeDatabase();
    process.env.DATABASE_URL = path.join(tmpDir, "test.db");
    runMigrations();
    await seed?.();
  });

  afterEach(() => {
    closeDatabase();
    delete process.env.DATABASE_URL;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
}
