"use client";

import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { LayoutGrid, LogOut, Receipt, Settings } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AddTransactionButton } from "@/features/transactions/add-transaction-button";
import { useThemePreference } from "@/app/theme-context";
import {
  fundingSourcesQueryOptions,
  purposesQueryOptions,
} from "@/lib/query-options";
import { logout } from "@/server/auth.actions";
import { cn } from "@/lib/utils";

const NAV: {
  href: "/dashboard" | "/dashboard/transactions" | "/dashboard/manage";
  label: string;
  Icon: typeof LayoutGrid;
  /**
   * "/dashboard" must match exactly or it stays highlighted on every child
   * route. "/dashboard/manage" must NOT, so it stays highlighted while on
   * .../purposes, .../funding-sources or .../links.
   */
  exact?: boolean;
}[] = [
  { href: "/dashboard", label: "Tổng quan", Icon: LayoutGrid, exact: true },
  { href: "/dashboard/transactions", label: "Giao dịch", Icon: Receipt },
  { href: "/dashboard/manage", label: "Quản lý", Icon: Settings },
];

/**
 * Both navigations are always in the HTML and swapped with `md:` classes
 * rather than by `useMediaQuery` — that hook's `getServerSnapshot` returns
 * false, so it would SSR the mobile branch everywhere and visibly jump to
 * the header on hydration for desktop's primary navigation.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const themePreference = useThemePreference();
  const router = useRouter();
  const queryClient = useQueryClient();

  /**
   * `logout` returns a plain `{success: true}` rather than throwing a
   * redirect (Next Server Actions can't be relied on to survive a thrown
   * redirect the way TanStack Router's client-side one did) — the shell does
   * the navigation itself once the action resolves. `removeQueries()` evicts
   * the whole client cache (not just `invalidate` — there is no `["session"]`
   * query left to invalidate, auth state lives only in the cookie now), then
   * a real navigation plus `refresh()` clears the App Router's own cached RSC
   * payload for `/dashboard`, which could otherwise reappear on Back.
   */
  const signOut = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      queryClient.removeQueries();
      router.replace("/login");
      router.refresh();
    },
  });
  const { data: purposes } = useSuspenseQuery(purposesQueryOptions());
  const { data: fundingSources } = useSuspenseQuery(
    fundingSourcesQueryOptions()
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: horizontal header. Hidden below md. */}
      <header className="sticky top-0 z-40 hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <span className="font-semibold tracking-tight">Grimoire</span>
          <nav className="flex flex-1 items-center gap-1">
            {NAV.map(({ href, label, Icon, exact }) => (
              <NavLink
                key={href}
                href={href}
                exact={exact}
                className="flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeClassName="bg-accent text-foreground"
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle themePreference={themePreference} />
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
          <ThemeToggle themePreference={themePreference} />
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
        {children}
      </main>

      {/* Floating add button — thumb reach, mobile only. */}
      <div
        className="fixed right-4 z-40 md:hidden"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        <AddTransactionButton
          purposes={purposes}
          fundingSources={fundingSources}
          appearance="floating"
        />
      </div>

      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex">
          {NAV.map(({ href, label, Icon, exact }) => (
            <li key={href} className="flex-1">
              <NavLink
                href={href}
                exact={exact}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1",
                  "text-xs font-medium text-muted-foreground transition-colors"
                )}
                activeClassName="text-brand"
              >
                <Icon className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
