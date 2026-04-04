import Link from "next/link";
import { LogOut, Receipt, Tags } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Giao dịch</span>
            </Link>
            <Link
              href="/dashboard/categories"
              className="hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
            >
              <Tags className="h-4 w-4" />
              <span className="hidden sm:inline">Danh mục</span>
            </Link>
          </nav>
          <form action={logoutAction}>
            <SubmitButton variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Đăng xuất</span>
            </SubmitButton>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
