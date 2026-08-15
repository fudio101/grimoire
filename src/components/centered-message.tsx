import Link from "next/link";

/**
 * Shared by app/not-found.tsx, app/error.tsx and app/global-error.tsx — the
 * three whole-page fallbacks that replace what `__root.tsx`'s `RootError`/
 * `RootNotFound` covered under TanStack Router. No hooks, no directive: a
 * Server Component (not-found.tsx) and Client Components (error.tsx,
 * global-error.tsx) can both render it directly.
 */
export function CenteredMessage({
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
      <Link href="/dashboard" className="text-sm underline">
        Về trang chủ
      </Link>
    </div>
  );
}
