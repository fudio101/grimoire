import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { MonthStepper } from "@/features/overview/month-stepper";
import { TotalCard, StatTile } from "@/features/overview/summary-cards";
import { CategoryBreakdown } from "@/features/overview/category-breakdown";
import { MonthlyTrendChart } from "@/features/overview/monthly-trend-chart";
import { formatVND, getCurrentMonth } from "@/lib/format";
import { overviewQueryOptions } from "@/lib/query-options";

const searchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/dashboard/")({
  validateSearch: searchSchema,
  // Loaders are keyed on the parsed pathname plus loaderDeps only. Without this
  // the month would change in the URL while the loader never re-ran — the page
  // would still show correct data, fetched on the client after hydration, so
  // SSR would be silently lost rather than visibly broken.
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      overviewQueryOptions(deps.month ?? getCurrentMonth())
    ),
  component: OverviewPage,
});

function OverviewPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const month = search.month ?? getCurrentMonth();

  const { data } = useSuspenseQuery(overviewQueryOptions(month));

  const daysElapsed = daysToCountFor(month);
  const perDay = daysElapsed > 0 ? Math.round(data.total / daysElapsed) : 0;

  return (
    <div className="space-y-4">
      <MonthStepper
        month={month}
        onChange={(next) => navigate({ search: { month: next } })}
      />

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
 * For a past month that is the whole month; for the current one it is only the
 * days that have happened. Dividing this month's spending by 31 on the 3rd
 * would report an average that is wrong by an order of magnitude.
 */
function daysToCountFor(month: string, now = new Date()): number {
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === mon;
  return isCurrent ? now.getDate() : daysInMonth;
}
