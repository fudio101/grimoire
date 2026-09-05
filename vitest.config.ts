import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = { "@": path.resolve(import.meta.dirname, "./src") };

/**
 * Two projects, split by file extension, because one resolution mode cannot
 * serve both kinds of test here.
 *
 * `server-only`'s package.json exports `./empty.js` (a no-op) under the
 * "react-server" condition and `./index.js` (which unconditionally throws)
 * under every other condition. Next's own server bundler sets "react-server"
 * when building server code, which is why `import "server-only"` is silent
 * there. Vitest's default `node` test environment resolves packages through
 * Vite's *SSR* pipeline, not its client one, so the condition has to go under
 * `ssr.resolve.conditions` — the top-level `resolve.conditions` (client /
 * browser-mode resolution) has no effect here and silently left `server-only`
 * throwing on every file under test that imports it (db/index.ts,
 * http-auth.ts, auth-guard.ts, public-report.queries.ts) until this was
 * corrected.
 *
 * But that same condition makes `react-dom` resolve to its React Server
 * Components build, whose `react-dom/server` entry throws on import — so a
 * test that renders a component to markup cannot run under it. Hence the
 * split: `.test.ts` is server-side and gets the condition, `.test.tsx` renders
 * components and does not.
 */
const projects = [
  {
    resolve: { alias },
    ssr: { resolve: { conditions: ["react-server", "import", "default"] } },
    test: {
      name: "server",
      environment: "node" as const,
      include: ["src/**/*.test.ts"],
    },
  },
  {
    resolve: { alias },
    test: {
      name: "components",
      environment: "node" as const,
      include: ["src/**/*.test.tsx"],
    },
  },
];

export default defineConfig({
  resolve: { alias },
  test: { projects },
});
