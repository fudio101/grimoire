import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: { port: 3000 },
  // Vite 8 resolves `@/*` straight from tsconfig; no vite-tsconfig-paths needed.
  resolve: { tsconfigPaths: true },
  /**
   * Base UI ships one entry point per component, so the dev dep-scanner only
   * discovers each as the first route using it renders — then re-optimizes and
   * forces a reload. Hitting that mid-render leaves a component holding a stale
   * React reference ("Cannot read properties of null (reading 'useRef')").
   * Pre-bundling everything up front removes four forced reloads on cold start.
   * Dev-only concern: the production build was unaffected.
   */
  optimizeDeps: {
    include: [
      "@base-ui/react/alert-dialog",
      "@base-ui/react/button",
      "@base-ui/react/checkbox",
      "@base-ui/react/collapsible",
      "@base-ui/react/dialog",
      "@base-ui/react/input",
      "@base-ui/react/menu",
      "@base-ui/react/merge-props",
      "@base-ui/react/popover",
      "@base-ui/react/select",
      "@base-ui/react/separator",
      "@base-ui/react/switch",
      "@base-ui/react/toast",
      "@base-ui/react/use-render",
      "@tanstack/react-form",
      "@tanstack/react-table",
      "@tanstack/react-virtual",
      "class-variance-authority",
      "clsx",
      "recharts",
      "tailwind-merge",
      "vaul",
      "zod",
    ],
  },
  environments: {
    // better-sqlite3 is a native addon — it must stay a runtime import rather
    // than being inlined into the server bundle.
    //
    // Everything else stays externalized (Vite's SSR default), so the runtime
    // image ships node_modules. Setting noExternal: true would shrink that a
    // lot, but it inflates the SSR chunks and starts pulling optional peers
    // (react-redux via recharts) into resolution — not worth the risk here.
    ssr: { resolve: { external: ["better-sqlite3"] } },
  },
  // tanstackStart() emits JSX that viteReact() then transforms, so order matters.
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
