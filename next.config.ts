import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // better-sqlite3 is a native addon — keep it a runtime `require` rather than
  // letting Next try to bundle it (mirrors Vite's `ssr.resolve.external` today).
  serverExternalPackages: ["better-sqlite3"],
  /**
   * File tracing follows static requires fine, but binding.js resolves its
   * prebuild with a *computed* path (`path.join(__dirname, "prebuilds", target
   * + ".node")`), which tracing cannot see through. Without this the
   * standalone output ships without the addon and fails at runtime, not at
   * build time — see PR 10's `find .../linuxmusl-*.node` build-time control,
   * which exists precisely because this is silent otherwise. Both arches
   * included for multi-arch image builds; each prebuild is ~2.3MB.
   *
   * `@swc/helpers` (a real, correctly-installed dependency of `next` itself —
   * confirmed present in the full, untraced `node_modules`) is the same class
   * of tracing gap under pnpm's virtual store: the standalone output's own
   * `require-hook.js` resolves it through a path tracing doesn't follow,
   * throwing `Cannot find module '.../@swc/helpers/esm/_interop_require_default.js'`
   * at container startup — found by actually running the built image against
   * real data (PR 10), not just building it; a build that "succeeds" here
   * still produces a standalone bundle that crashes on its first request.
   * Wildcarded on version so a future `@swc/helpers` patch bump (pulled in
   * transitively by `next` itself) doesn't silently reopen this gap.
   */
  outputFileTracingIncludes: {
    // Each prebuild is a flat `<platform>.node` file, not a directory.
    "/**": [
      "./node_modules/better-sqlite3/prebuilds/linuxmusl-*.node",
      "./node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**",
    ],
  },
  typedRoutes: true,
  // Old TanStack Router paths, kept live for bookmarks/screenshots that named
  // them — same redirects as src/routes/index.tsx, dashboard/categories.tsx,
  // dashboard/links.tsx and dashboard/manage/index.tsx today.
  async redirects() {
    return [
      { source: "/", destination: "/dashboard", permanent: false },
      {
        source: "/dashboard/categories",
        destination: "/dashboard/manage/categories",
        permanent: false,
      },
      {
        source: "/dashboard/links",
        destination: "/dashboard/manage/links",
        permanent: false,
      },
      {
        source: "/dashboard/manage",
        destination: "/dashboard/manage/categories",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
