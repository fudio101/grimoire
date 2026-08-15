"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CategoryBreakdown } from "@/features/overview/category-breakdown";
import { MonthStepper } from "@/features/overview/month-stepper";
import { MonthlyTrendChart } from "@/features/overview/monthly-trend-chart";
import { StatTile, TotalCard } from "@/features/overview/summary-cards";
import { useDelayedPending } from "@/hooks/use-delayed-pending";
import { formatVND } from "@/lib/format";
import { overviewQueryOptions } from "@/lib/query-options";
import { cn } from "@/lib/utils";

export function OverviewView({ month }: { month: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showPending = useDelayedPending(isPending);
  const { data } = useSuspenseQuery(overviewQueryOptions(month));

  const daysElapsed = daysToCountFor(month);
  const perDay = daysElapsed > 0 ? Math.round(data.total / daysElapsed) : 0;

  // Non-shallow: App Router has no shallow-routing primitive that also
  // re-renders the server tree, so a real `router.push` is what reconstructs
  // the `loaderDeps` guarantee TanStack Router gave this page for free.
  function navigateToMonth(next: string) {
    startTransition(() => {
      router.push(`/dashboard?month=${next}`, { scroll: false });
    });
  }

  return (
    <div
      aria-busy={showPending}
      className={cn(
        "space-y-4 transition-opacity",
        showPending && "opacity-60"
      )}
    >
      <MonthStepper month={month} onChange={navigateToMonth} />

      {/* One column on a phone; the summary row goes horizontal as soon as
          there is width for it, so desktop is not a stretched phone. */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <TotalCard
            total={data.total}
            previousTotal={data.previousTotal}
            count={data.count}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
          <StatTile label="Trung bình mỗi ngày" value={formatVND(perDay)} />
          <StatTile label="Số khoản chi" value={String(data.count)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CategoryBreakdown items={data.byRootCategory} total={data.total} />
        <MonthlyTrendChart series={data.monthlySeries} />
      </div>
    </div>
  );
}

/**
 * Days to divide by for the daily average.
 *
 * For a past month that is the whole month; for the current one it is only
 * the days that have happened. Dividing this month's spending by 31 on the
 * 3rd would report an average that is wrong by an order of magnitude.
 */
function daysToCountFor(month: string, now = new Date()): number {
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === mon;
  return isCurrent ? now.getDate() : daysInMonth;
}
