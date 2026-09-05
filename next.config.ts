import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /**
   * Enabled now rather than earlier because the codebase was already
   * compiler-clean: eslint-plugin-react-hooks@7's flat.recommended turns on the
   * full React Compiler rule set (purity, immutability,
   * preserve-manual-memoization, set-state-in-render, refs, globals, …) and the
   * repo passes it with exactly one suppression, in transaction-data-table.tsx.
   *
   * Manual useMemo/useCallback are deliberately left in place — the compiler
   * honours them (preserve-manual-memoization enforces that), and removing them
   * is a behaviour change that belongs in its own PR, not smuggled in with the
   * flag that makes it possible.
   */
  reactCompiler: true,
  // better-sqlite3 is a native addon — keep it a runtime `require` rather than
  // letting Next try to bundle it.
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
  /**
   * TypeScript runs side-by-side per the TS 7 release notes: `typescript` is
   * aliased to `@typescript/typescript6` (the compiler *API*, which
   * typescript-eslint still needs — typescript-eslint#10940 is open and locked
   * until TS ships a new API in 7.1), while `@typescript/native` is real TS 7
   * and owns the `tsc` binary that `pnpm run typecheck` calls.
   *
   * Next 16.3 defaults `useTypeScriptCli` to true, which looks for
   * `typescript/bin/tsc`. The TS 6 alias package only ships `bin/tsc6`, so that
   * default fails the dependency check outright ("do not have the required
   * package(s) installed"). Pointing Next back at the API path is what makes
   * the alias work.
   */
  experimental: {
    useTypeScriptCli: false,
    /**
     * Runs the React Compiler as native code inside Turbopack instead of as a
     * Babel pass, so Babel never enters the build pipeline and
     * `babel-plugin-react-compiler` is not a dependency at all.
     *
     * Chosen over the documented Babel path on measurements, not preference —
     * three builds each on a clean `.next`, against a control with the compiler
     * off:
     *
     *   | config   | build (median) | memo-cache slots in the client chunks |
     *   |----------|----------------|---------------------------------------|
     *   | off      | 11.31s         |   0   ← control                       |
     *   | Babel    | 18.51s (+64%)  | 212                                   |
     *   | Rust     | 13.45s (+19%)  | 212                                   |
     *
     * Same amount of compiled output either way: 30 of 35 client chunks are
     * byte-identical between the two, and the totals differ by 45 bytes across
     * 2.2MB. `experimental` here is about the flag's stability, not the
     * output's.
     *
     * The cost this trades against is memory on the self-hosted runner, which
     * has no swap and OOM-killed `next-build` once already (see PR #127). The
     * Babel path spreads its work across Node workers while this one adds to
     * the single Turbopack process — the exact process the kernel killed. If a
     * Build step ever exits 137, reverting is this line plus reinstalling
     * `babel-plugin-react-compiler`.
     */
    turbopackRustReactCompiler: true,
  },
  /**
   * Static headers only. The Content-Security-Policy is set in `src/proxy.ts`
   * instead, because it carries a per-request nonce and nothing here can vary
   * per request.
   *
   * `X-Frame-Options` is redundant with the CSP's `frame-ancestors 'none'` for
   * any browser released this decade, and is kept for the ones that are not.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // The app asks for none of these. Denying them means an injected
            // script cannot ask on its behalf either.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  // Old TanStack Router paths, kept live for bookmarks/screenshots that named
  // them — same redirects those routes' now-deleted src/routes/index.tsx,
  // dashboard/links.tsx and dashboard/manage/index.tsx used to define.
  //
  // `/dashboard/categories` is deliberately NOT among them any more. ADR-0001
  // says the retired vocabulary gets no redirects: a redirect layer is exactly
  // where the word `category` would survive forever, and for a single-user
  // application a broken bookmark costs one retype.
  //
  // `/dashboard/manage` is NOT one of those: it is the live target of the
  // "Quản lý" nav tab, so its destination has to name a route that exists.
  // It pointed at the deleted `.../categories` for a while, which 404'd the
  // main navigation — a redirect destination is a plain string that neither
  // the compiler nor the route table checks.
  async redirects() {
    return [
      { source: "/", destination: "/dashboard", permanent: false },
      {
        source: "/dashboard/links",
        destination: "/dashboard/manage/links",
        permanent: false,
      },
      {
        source: "/dashboard/manage",
        destination: "/dashboard/manage/purposes",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
