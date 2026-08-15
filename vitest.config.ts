import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  // `server-only`'s package.json exports `./empty.js` (a no-op) under the
  // "react-server" condition and `./index.js` (which unconditionally throws)
  // under every other condition. Next's own server bundler sets
  // "react-server" when building server code, which is why `import
  // "server-only"` is silent there. Vitest's default `node` test environment
  // resolves packages through Vite's *SSR* pipeline, not its client one, so
  // the condition has to go under `ssr.resolve.conditions` — the top-level
  // `resolve.conditions` (client/browser-mode resolution) has no effect here
  // and silently left `server-only` throwing on every file under test that
  // imports it (db/index.ts, http-auth.ts, auth-guard.ts,
  // public-report.queries.ts) until this was corrected.
  ssr: {
    resolve: {
      conditions: ["react-server", "import", "default"],
    },
  },
  test: {
    environment: "node",
  },
});
