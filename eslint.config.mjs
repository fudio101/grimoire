import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import pluginQuery from "@tanstack/eslint-plugin-query";
import nextPlugin from "@next/eslint-plugin-next";
import prettier from "eslint-config-prettier";

/**
 * `@next/eslint-plugin-next` directly, not the `eslint-config-next` wrapper:
 * the wrapper bundles a pinned `eslint-plugin-react`, and that pinned version
 * throws (`contextOrFilename.getFilename is not a function`) under this
 * project's ESLint 10 — a real incompatibility between the two packages'
 * release cadences, not a config mistake. This project already has its own
 * `eslint-plugin-react-hooks` and has no class components for
 * `eslint-plugin-react`'s prop-types rules to check, so nothing of substance
 * is lost by taking only the Next-specific rules.
 *
 * Was scoped to `src/app/**` only. An earlier attempt at widening this to
 * repo-wide OOM-killed the self-hosted CI runner's Lint step after ~5
 * minutes (exit 137). Re-measured with `TIMING=20 pnpm run lint` on a
 * repo-wide `core-web-vitals` before retrying this: every `@next/next/*`
 * rule combined costs under 4ms — `no-html-link-for-pages` (the one rule
 * here that reads the route tree from disk, and the obvious first suspect)
 * is 0.3% of total rule time. The real cost, ~90% of it, is
 * `react-hooks/static-components` from `eslint-plugin-react-hooks`'s
 * `flat.recommended` below — which has no `files` restriction and
 * therefore *already* ran across this same `src/components/ui/` +
 * `src/features/**` tree even while this plugin was still narrow-scoped.
 * Confirmed identical timing on the narrow-scope config, so that cost
 * isn't new and was never caused by this plugin's `files` setting.
 *
 * `core-web-vitals` also sets no `languageOptions` (no type-aware
 * `parserOptions`), so widening it doesn't balloon a TypeScript program
 * graph either. Neither of that rules out the original OOM being real —
 * this repo's own CI comments already note that local macOS testing never
 * reproduces this runner's failure mode — but the rule-time evidence gave
 * enough confidence to widen this for real and let the actual CI run be
 * the verdict, rather than re-testing on paper indefinitely. If this ever
 * OOMs the runner again, get per-step memory data from the runner itself
 * before narrowing back — a repeat wouldn't say which rule is the cause,
 * only that scope is (which we already knew).
 */
const eslintConfig = defineConfig([
  globalIgnores([
    // Nothing produces any of these any more (Vite and TanStack Start are
    // both gone as of PR 9), but the self-hosted CI runner checks out with
    // `clean: false` — its working directory has been reused across this
    // whole migration's PRs and can still hold a stale `dist/` from a much
    // earlier `vite build`. PR 9 briefly dropped these entries on the
    // (wrong) assumption that "nothing produces them" meant "nothing has
    // them" — confirmed a 2.4M leftover `dist/` still on the runner, which
    // ESLint then tried to parse as source, a real contributor to that PR's
    // CI OOM. Keep this list even though it should be a no-op on a fresh
    // checkout.
    ".next/**",
    "next-env.d.ts",
    "dist/**",
    ".vite/**",
    ".tanstack/**",
    "build/**",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  // `exhaustive-deps` catches query keys that omit a filter.
  ...pluginQuery.configs["flat/recommended"],
  {
    ...nextPlugin.configs["core-web-vitals"],
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      // Pages Router leftover — reads the route tree from disk to flag
      // <a> tags that should be <Link>. This project has no pages/
      // directory and never will; the rule is dead weight, not a guard.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  prettier,
]);

export default eslintConfig;
