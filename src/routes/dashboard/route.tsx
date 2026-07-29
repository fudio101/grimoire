import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
} from "@tanstack/react-router";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { LayoutGrid, LogOut, Receipt, Settings } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AddTransactionButton } from "@/features/transactions/add-transaction-button";
import {
  categoriesQueryOptions,
  sessionQueryOptions,
} from "@/lib/query-options";
import { logout } from "@/server/auth.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  /**
   * Replaces src/proxy.ts. This is a UX guard only — it keeps signed-out
   * visitors off the screen, and unlike middleware it also runs on client-side
   * navigation. The actual security boundary is the requireAdmin middleware on
   * every private server function.
   */
  beforeLoad: async ({ context }) => {
    const admin = await context.queryClient.ensureQueryData(
      sessionQueryOptions()
    );
    if (!admin) throw redirect({ to: "/login" });
    return { admin };
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoriesQueryOptions()),
  component: DashboardLayout,
});

const NAV: {
  to: "/dashboard" | "/dashboard/transactions" | "/dashboard/manage";
  label: string;
  Icon: typeof LayoutGrid;
  /**
   * "/dashboard" must match exactly or it stays highlighted on every child
   * route. "/dashboard/manage" must NOT, so it stays highlighted while you are
   * on .../categories or .../links.
   */
  exact?: boolean;
}[] = [
  { to: "/dashboard", label: "Tổng quan", Icon: LayoutGrid, exact: true },
  { to: "/dashboard/transactions", label: "Giao dịch", Icon: Receipt },
  { to: "/dashboard/manage", label: "Quản lý", Icon: Settings },
];

/**
 * Both navigations are always in the HTML and swapped with `md:` classes rather
 * than by `useMediaQuery`.
 *
 * That hook's getServerSnapshot returns false, so every consumer renders its
 * mobile branch during SSR and swaps after hydration. That is a fine trade for a
 * modal; for the primary navigation it would mean a visible jump from bottom bar
 * to header on every desktop page load.
 */
function DashboardLayout() {
  const signOut = useMutation({ mutationFn: () => logout() });
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: horizontal header. Hidden below md. */}
      <header className="sticky top-0 z-40 hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <span className="font-semibold tracking-tight">Grimoire</span>
          <nav className="flex flex-1 items-center gap-1">
            {NAV.map(({ to, label, Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: exact ?? false }}
                className="flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{
                  className: "bg-accent text-foreground",
                  "aria-current": "page",
                }}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                signOut.mutate();
              }}
            >
              <SubmitButton variant="ghost" isLoading={signOut.isPending}>
                <LogOut />
                Đăng xuất
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile: compact title bar. The nav itself lives at the bottom. */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <span className="font-semibold tracking-tight">Grimoire</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signOut.mutate();
            }}
          >
            <SubmitButton
              variant="ghost"
              size="icon"
              isLoading={signOut.isPending}
              aria-label="Đăng xuất"
            >
              <LogOut />
            </SubmitButton>
          </form>
        </div>
      </header>

      {/*
       * pb-28 clears the 64px bottom bar plus the floating button above it.
       * Desktop has neither, so the padding is dropped from md up.
       */}
      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 md:pb-6">
        <Outlet />
      </main>

      {/* Floating add button — thumb reach, mobile only. */}
      <div
        className="fixed right-4 z-40 md:hidden"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        <AddTransactionButton categories={categories} appearance="floating" />
      </div>

      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex">
          {NAV.map(({ to, label, Icon, exact }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: exact ?? false }}
                // Labels are always visible. The previous header hid them below
                // `sm`, leaving three unlabelled icons as the only navigation on
                // exactly the device this app is mostly used on.
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1",
                  "text-xs font-medium text-muted-foreground transition-colors"
                )}
                activeProps={{
                  className: "text-brand",
                  "aria-current": "page",
                }}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
