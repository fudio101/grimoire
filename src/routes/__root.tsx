import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import appCss from "@/styles/app.css?url";
import { themeQueryOptions } from "@/lib/query-options";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { Toaster } from "@/components/ui/toast";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  beforeLoad: async ({ context }) => ({
    themePreference:
      await context.queryClient.ensureQueryData(themeQueryOptions()),
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Grimoire — Quản lý chi tiêu" },
      { name: "description", content: "Ứng dụng quản lý chi tiêu cá nhân" },
      // Tells the browser to render form controls, scrollbars and the address
      // bar in the matching scheme. Without it a dark page keeps light chrome.
      { name: "color-scheme", content: "light dark" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
    scripts: [{ children: THEME_INIT_SCRIPT }],
  }),
  component: RootLayout,
  // Next.js shipped default error and 404 pages; TanStack Start does not, and
  // without these the router logs "this error wasn't caught by any route".
  errorComponent: RootError,
  notFoundComponent: RootNotFound,
});

function Centered({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{children}</p>
      <Link to="/dashboard" className="text-sm underline">
        Về trang chủ
      </Link>
    </div>
  );
}

function RootError() {
  return (
    <Centered title="Đã xảy ra lỗi">
      Không thể tải trang này. Vui lòng thử lại.
    </Centered>
  );
}

function RootNotFound() {
  return (
    <Centered title="Không tìm thấy trang">
      Trang bạn tìm không tồn tại.
    </Centered>
  );
}

function RootLayout() {
  const { themePreference } = Route.useRouteContext();

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
        <HeadContent />
      </head>
      <body className="antialiased">
        <Toaster>
          <Outlet />
        </Toaster>
        <Scripts />
      </body>
    </html>
  );
}
