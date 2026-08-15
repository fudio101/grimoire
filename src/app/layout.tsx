import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "@/styles/app.css";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COOKIE_NAME,
  THEME_INIT_SCRIPT,
  isThemePreference,
} from "@/lib/theme";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Grimoire — Quản lý chi tiêu",
  description: "Ứng dụng quản lý chi tiêu cá nhân",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Tells the browser to render form controls, scrollbars and the address bar
  // in the matching scheme. Without it a dark page keeps light chrome.
  colorScheme: "light dark",
};

/**
 * Port of `__root.tsx`. Reading `cookies()` here (for theme, same as
 * `theme.functions.ts`'s `getCookie` today) opts the whole tree out of static
 * generation — see plan hazard 3: without a per-request read somewhere in the
 * root, `/login` and the `/dashboard/manage/*` screens have no per-request
 * input at the page level and Next could prerender them once at build time,
 * baking one admin's data into a static shell served forever.
 *
 * `export const dynamic = "force-dynamic"` below is not redundant with that
 * read. `next build`'s static-generation attempt renders a page's own async
 * Server Component concurrently with its ancestor layouts rather than
 * strictly after them, so a page that calls a `lib/db/queries.ts`/
 * `server/*.queries.ts` function directly (PR 7 onward — the whole point of
 * the self-fetch-avoidance rule in `query-options.ts`) can open `data.db`
 * before this layout's `cookies()` call ever gets a chance to bail the
 * render out. `force-dynamic` is checked per route segment before any
 * component body runs at all, cascades to every nested layout/page, and
 * closes that gap for good — confirmed by tracing an actual `next build`
 * that reproduced the leak without it.
 */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const themePreference = isThemePreference(raw)
    ? raw
    : DEFAULT_THEME_PREFERENCE;

  return (
    /*
     * An explicit preference is rendered here so SSR already carries it. The
     * "system" default cannot be resolved on the server, so it renders bare and
     * THEME_INIT_SCRIPT adds the class in <head> before first paint.
     *
     * suppressHydrationWarning is required precisely because of that script: it
     * mutates this element's class between SSR and hydration, which React would
     * otherwise report as a mismatch. It suppresses the warning for this element
     * only, not its subtree.
     */
    <html
      lang="vi"
      className={themePreference === "dark" ? "dark" : undefined}
      suppressHydrationWarning
    >
      <head>
        {/* Same inline, dependency-free init script as __root.tsx: must run
            synchronously in <head>, before the browser paints anything. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <Providers themePreference={themePreference}>{children}</Providers>
      </body>
    </html>
  );
}
