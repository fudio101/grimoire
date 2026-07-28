import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: { port: 3000 },
  // Vite 8 resolves `@/*` straight from tsconfig; no vite-tsconfig-paths needed.
  resolve: { tsconfigPaths: true },
  environments: {
    // better-sqlite3 is a native addon — it must stay a runtime import rather
    // than being inlined into the server bundle.
    ssr: { resolve: { external: ["better-sqlite3"] } },
  },
  // tanstackStart() emits JSX that viteReact() then transforms, so order matters.
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
