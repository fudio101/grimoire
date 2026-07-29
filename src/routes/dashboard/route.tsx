import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
} from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { LogOut, Receipt, Share2, Tags } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { sessionQueryOptions } from "@/lib/query-options";
import { logout } from "@/server/auth.functions";

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
  component: DashboardLayout,
});

const navLinkClass =
  "hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium";

function DashboardLayout() {
  const signOut = useMutation({ mutationFn: () => logout() });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <nav className="flex items-center gap-1">
            <Link to="/dashboard" className={navLinkClass}>
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Giao dịch</span>
            </Link>
            <Link to="/dashboard/categories" className={navLinkClass}>
              <Tags className="h-4 w-4" />
              <span className="hidden sm:inline">Danh mục</span>
            </Link>
            <Link to="/dashboard/links" className={navLinkClass}>
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Link công khai</span>
            </Link>
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
                <span className="hidden sm:inline">Đăng xuất</span>
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
