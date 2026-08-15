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
 */
const eslintConfig = defineConfig([
  globalIgnores([
    // Leftovers from before the TanStack Start migration. Nothing produces
    // these any more, but any checkout that once ran `next build` still has
    // them — including the self-hosted CI runner, which checks out with
    // `clean: false`. Without this, eslint walks into .next/ and either lints
    // build output or crashes on a file that vanished mid-run.
    ".next/**",
    "next-env.d.ts",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  // `exhaustive-deps` catches query keys that omit a filter.
  ...pluginQuery.configs["flat/recommended"],
  nextPlugin.configs["core-web-vitals"],
  prettier,
]);

export default eslintConfig;
