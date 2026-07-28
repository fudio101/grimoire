import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import appCss from "@/styles/app.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Grimoire — Quản lý chi tiêu" },
      { name: "description", content: "Ứng dụng quản lý chi tiêu cá nhân" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
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
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
