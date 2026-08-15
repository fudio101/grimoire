"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * `next/link` has no `activeProps`/`activeOptions` of its own —
 * `usePathname()` plus a manual comparison is the App Router's answer to
 * what TanStack Router's `Link` did for the dashboard nav and the manage
 * tabs.
 */
export function NavLink({
  href,
  exact = false,
  activeClassName,
  className,
  ...props
}: ComponentProps<typeof Link> & {
  /** Exact match only — e.g. "/dashboard" must not stay lit on every child. */
  exact?: boolean;
  activeClassName: string;
}) {
  const pathname = usePathname();
  const target = href.toString();
  const isActive = exact
    ? pathname === target
    : pathname === target || pathname.startsWith(`${target}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(className, isActive && activeClassName)}
      {...props}
    />
  );
}
