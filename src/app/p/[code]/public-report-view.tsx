"use client";

import { useMemo, useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { CategoryBreakdown } from "@/features/overview/category-breakdown";
import { CategoryPickerField } from "@/features/categories/category-picker";
import { ExpenseChart } from "@/features/transactions/expense-chart";
import { PublicMonthStepper } from "@/features/public-report/public-month-stepper";
import { PublicTotalCard } from "@/features/public-report/public-total-card";
import { PublicTransactionList } from "@/features/public-report/public-transaction-list";
import { useThemePreference } from "@/app/theme-context";
import { useDelayedPending } from "@/hooks/use-delayed-pending";
import { useMediaQuery } from "@/hooks/use-media-query";
import { publicReportQueryOptions } from "@/lib/query-options";
import type { PublicReportUrlSearch } from "@/lib/search-params";
import type { TransactionTableRow } from "@/lib/types";
import type { CategoryLike } from "@/lib/category-tree";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { PublicShell } from "./public-shell";

function buildHref(code: string, next: Partial<PublicReportUrlSearch>): Route {
  const params = new URLSearchParams();
  if (next.fromMonth) params.set("fromMonth", next.fromMonth);
  if (next.toMonth) params.set("toMonth", next.toMonth);
  if (next.category) params.set("category", next.category);
  const qs = params.toString();
  // Non-literal string: typedRoutes can't validate a query-string-bearing
  // href against its route table, so this is the documented escape hatch.
  return (qs ? `/p/${code}?${qs}` : `/p/${code}`) as Route;
}

export function PublicReportView({
  code,
  search,
}: {
  code: string;
  search: PublicReportUrlSearch;
}) {
  const themePreference = useThemePreference();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showPending = useDelayedPending(isPending);
  const { data: report } = useSuspenseQuery(
    publicReportQueryOptions(code, search)
  );

  // The page's own `getPublicReport` call already resolves `notFound()` for
  // a missing report before this component ever renders — this guard is for
  // types, since `useSuspenseQuery`'s type is `PublicReport | null`.
  if (!report) return null;

  // A single month is expressed as fromMonth === toMonth, which keeps the
  // URL contract unchanged and means the server needs no new search
  // parameter.
  const month =
    search.fromMonth && search.fromMonth === search.toMonth
      ? search.fromMonth
      : null;

  function navigate(next: Partial<PublicReportUrlSearch>) {
    startTransition(() => {
      router.push(buildHref(code, { ...search, ...next }), {
        scroll: false,
      });
    });
  }

  return (
    <PublicShell>
      <ReportBody
        linkName={report.linkName}
        transactions={report.transactions}
        total={report.total}
        previousTotal={report.previousTotal}
        filterCategories={report.filterCategories}
        month={month}
        category={search.category}
        themePreference={themePreference}
        showPending={showPending}
        onMonthChange={(next) =>
          navigate({ fromMonth: next ?? undefined, toMonth: next ?? undefined })
        }
        onCategoryChange={(next) => navigate({ category: next ?? undefined })}
      />
    </PublicShell>
  );
}

function ReportBody({
  linkName,
  transactions,
  total,
  previousTotal,
  filterCategories,
  month,
  category,
  onMonthChange,
  onCategoryChange,
  themePreference,
  showPending,
}: {
  linkName: string | null;
  transactions: TransactionTableRow[];
  total: number;
  previousTotal: number | null;
  filterCategories: CategoryLike[];
  month: string | null;
  category: string | undefined;
  onMonthChange: (month: string | null) => void;
  onCategoryChange: (category: string | null) => void;
  themePreference: ThemePreference;
  showPending: boolean;
}) {
  // Collapsed on a phone, where an open chart pushes the entries off screen;
  // open from md, where there is room for both.
  const isWide = useMediaQuery("(min-width: 768px)");

  /**
   * Spending per top-level category, rolled up in the browser.
   *
   * No server work is needed: every row already carries `categoryPathParts`,
   * resolved server-side so the category tree never ships to an anonymous
   * visitor, and its first element is exactly the top-level name.
   */
  const byCategory = useMemo(() => {
    const buckets = new Map<
      string,
      { id: string; name: string; total: number }
    >();
    for (const tx of transactions) {
      const name = tx.categoryPathParts[0] ?? "Khác";
      const existing = buckets.get(name);
      if (existing) existing.total += tx.amount;
      else buckets.set(name, { id: name, name, total: tx.amount });
    }
    return [...buckets.values()].sort((a, b) => b.total - a.total);
  }, [transactions]);

  return (
    <div
      aria-busy={showPending}
      className={cn(
        "space-y-6 transition-opacity",
        showPending && "opacity-60"
      )}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words">
            {linkName || "Báo cáo chi tiêu"}
          </h1>
          <p className="text-muted-foreground">Báo cáo được chia sẻ với bạn</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground">Giao diện</span>
          <ThemeToggle themePreference={themePreference} />
        </div>
      </header>

      <PublicMonthStepper month={month} onChange={onMonthChange} />

      <PublicTotalCard
        total={total}
        previousTotal={previousTotal}
        count={transactions.length}
      />

      {/*
       * The same drill-down picker the dashboard uses, driven by the scoped
       * tree the server ships. It replaces a flat select whose every option
       * repeated its whole "A / B / C" path.
       */}
      {filterCategories.length > 1 && (
        <div className="space-y-1.5">
          <Label>Xem theo nhóm</Label>
          <CategoryPickerField
            categories={filterCategories}
            value={category ?? null}
            onChange={(id) => onCategoryChange(id)}
            // Picking a parent means its whole subtree, intersected
            // server-side with what this link is allowed to show.
            selectable="all"
            clearLabel="Tất cả các nhóm"
            placeholder="Tất cả các nhóm"
            title="Xem theo nhóm"
            className="h-12"
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="min-w-0 space-y-6">
          <CategoryBreakdown items={byCategory} total={total} />

          {/*
           * One frame, not two. The chart card collapses itself on a phone —
           * wrapping it in a separate collapsible produced a button and then
           * a visibly separate card below it, and Recharts measured its
           * width while that wrapper was still at zero height, which pushed
           * the page sideways when it opened.
           */}
          <ExpenseChart transactions={transactions} collapsible={!isWide} />
        </div>

        <section className="min-w-0 space-y-3">
          <h2 className="font-semibold tracking-tight">Từng khoản chi</h2>
          <PublicTransactionList transactions={transactions} />
        </section>
      </div>
    </div>
  );
}
