"use client";

import { useMemo, useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { PurposeBreakdown } from "@/features/overview/purpose-breakdown";
import { DimensionSelect } from "@/features/dimensions/dimension-select";
import { ExpenseChart } from "@/features/transactions/expense-chart";
import { PublicMonthStepper } from "@/features/public-report/public-month-stepper";
import { PublicTotalCard } from "@/features/public-report/public-total-card";
import { PublicTransactionList } from "@/features/public-report/public-transaction-list";
import { useThemePreference } from "@/app/theme-context";
import { useDelayedPending } from "@/hooks/use-delayed-pending";
import { useMediaQuery } from "@/hooks/use-media-query";
import { publicReportQueryOptions } from "@/lib/query-options";
import type { PublicReportUrlSearch } from "@/lib/search-params";
import type {
  PurposeOption,
  PurposeTotal,
  TransactionTableRow,
} from "@/lib/types";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { PublicShell } from "./public-shell";

function buildHref(code: string, next: Partial<PublicReportUrlSearch>): Route {
  const params = new URLSearchParams();
  if (next.fromMonth) params.set("fromMonth", next.fromMonth);
  if (next.toMonth) params.set("toMonth", next.toMonth);
  if (next.purpose) params.set("purpose", next.purpose);
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
        filterPurposes={report.filterPurposes}
        month={month}
        purpose={search.purpose}
        themePreference={themePreference}
        showPending={showPending}
        onMonthChange={(next) =>
          navigate({ fromMonth: next ?? undefined, toMonth: next ?? undefined })
        }
        onPurposeChange={(next) => navigate({ purpose: next ?? undefined })}
      />
    </PublicShell>
  );
}

function ReportBody({
  linkName,
  transactions,
  total,
  previousTotal,
  filterPurposes,
  month,
  purpose,
  onMonthChange,
  onPurposeChange,
  themePreference,
  showPending,
}: {
  linkName: string | null;
  transactions: TransactionTableRow[];
  total: number;
  previousTotal: number | null;
  filterPurposes: PurposeOption[];
  month: string | null;
  purpose: string | undefined;
  onMonthChange: (month: string | null) => void;
  onPurposeChange: (purpose: string | null) => void;
  themePreference: ThemePreference;
  showPending: boolean;
}) {
  // Collapsed on a phone, where an open chart pushes the entries off screen;
  // open from md, where there is room for both.
  const isWide = useMediaQuery("(min-width: 768px)");

  /**
   * Spending per Purpose, with its funding split, rolled up in the browser.
   *
   * No server work is needed: every row already carries both dimensions by id
   * and by name. Keyed by **id**, not by name — the old version bucketed on the
   * name it had to dig out of a breadcrumb, so two distinct entries sharing a
   * name silently merged into one bar. Nothing collided in practice, but the
   * flat model makes same-named entries no less possible and this is the roll-up
   * a reader trusts.
   *
   * The funding split is shown here on purpose: ADR-0002 decided a link's
   * readers may see how much of a cost was covered rather than self-paid.
   */
  const byPurpose = useMemo(() => {
    const buckets = new Map<string, PurposeTotal>();
    for (const tx of transactions) {
      let bucket = buckets.get(tx.purposeId);
      if (!bucket) {
        bucket = {
          id: tx.purposeId,
          name: tx.purposeName,
          total: 0,
          byFundingSource: [],
        };
        buckets.set(tx.purposeId, bucket);
      }
      bucket.total += tx.amount;

      const share = bucket.byFundingSource.find(
        (s) => s.id === tx.fundingSourceId
      );
      if (share) share.total += tx.amount;
      else
        bucket.byFundingSource.push({
          id: tx.fundingSourceId,
          name: tx.fundingSourceName,
          total: tx.amount,
        });
    }
    for (const bucket of buckets.values()) {
      bucket.byFundingSource.sort((a, b) => b.total - a.total);
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
       * Exactly the Purposes this link was given, and no Funding Source
       * control at all: a link's scope is one-dimensional (ADR-0002), so the
       * server would ignore that parameter and offering it would be a lie.
       * Whatever is picked here is intersected server-side with the link's own
       * scope, so a hand-edited URL cannot widen it.
       */}
      {filterPurposes.length > 1 && (
        <div className="space-y-1.5">
          <Label htmlFor="public-report-purpose">Xem theo mục đích chi</Label>
          <DimensionSelect
            id="public-report-purpose"
            options={filterPurposes}
            value={purpose ?? null}
            onChange={onPurposeChange}
            placeholder="Tất cả mục đích chi"
            emptyOption="Tất cả mục đích chi"
            unknownLabel="Mục đích chi không còn tồn tại"
            // 48px, not the default 44/40: this is the phone-first public
            // surface and its one control should be the easiest to hit.
            triggerClassName="h-12"
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="min-w-0 space-y-6">
          <PurposeBreakdown items={byPurpose} total={total} />

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
