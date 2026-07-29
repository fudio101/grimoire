import { useMemo } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { CategoryBreakdown } from "@/features/overview/category-breakdown";
import { CategoryPickerField } from "@/features/categories/category-picker";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ExpenseChart } from "@/features/transactions/expense-chart";
import { PublicMonthStepper } from "@/features/public-report/public-month-stepper";
import { PublicTotalCard } from "@/features/public-report/public-total-card";
import { PublicTransactionList } from "@/features/public-report/public-transaction-list";
import { publicReportQueryOptions } from "@/lib/query-options";
import { monthRangeSearchSchema, SHARE_CODE_SHAPE } from "@/lib/schemas";
import type { TransactionTableRow } from "@/lib/types";
import type { CategoryLike } from "@/lib/category-tree";

const searchSchema = monthRangeSearchSchema.extend({
  category: z.string().optional(),
});

export const Route = createFileRoute("/p/$code")({
  validateSearch: searchSchema,
  // Without this the loader is keyed on the pathname alone, so changing a
  // filter would update the URL while the loader quietly never re-ran.
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    // A code that cannot exist gets the same "link not found" screen as one
    // that merely does not. Left to the server function's validator it would
    // throw instead, and a mistyped or truncated link would answer with the
    // error page — which tells the reader to retry something that will never
    // work, rather than to ask for a new link.
    if (!SHARE_CODE_SHAPE.test(params.code)) throw notFound();

    const report = await context.queryClient.ensureQueryData(
      publicReportQueryOptions(params.code, deps)
    );
    if (!report) throw notFound();
  },
  component: PublicView,
  notFoundComponent: LinkNotFound,
  errorComponent: PublicError,
});

/**
 * The whole page runs one step up the type scale.
 *
 * The dashboard is used by one person who chose this app; this page is read by
 * whoever was sent the link, and it was previously carrying the smallest text in
 * the entire product. The scale is set on the wrapper and the components below
 * avoid `text-sm`, so it actually reaches the content rather than being
 * overridden by every child.
 */
function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-[1.0625rem] md:text-lg">
      <div className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl md:py-10">
        {children}
      </div>
    </div>
  );
}

function LinkNotFound() {
  return (
    <PublicShell>
      <div className="space-y-3 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Không mở được liên kết này
        </h1>
        <p className="text-muted-foreground">
          Liên kết có thể đã bị tắt, hoặc địa chỉ được sao chép chưa đầy đủ. Bạn
          hãy nhắn cho người đã gửi liên kết để nhận lại link mới.
        </p>
      </div>
    </PublicShell>
  );
}

/**
 * A loader failure here previously fell through to the root error page, which
 * offers a "Về trang chủ" link that means nothing to someone who only ever had
 * this URL.
 */
function PublicError() {
  return (
    <PublicShell>
      <div className="space-y-3 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Chưa tải được báo cáo
        </h1>
        <p className="text-muted-foreground">
          Có lỗi xảy ra khi tải dữ liệu. Bạn thử tải lại trang giúp nhé.
        </p>
        <Button size="lg" onClick={() => window.location.reload()}>
          Tải lại trang
        </Button>
      </div>
    </PublicShell>
  );
}

function PublicView() {
  const { code } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: report } = useSuspenseQuery(
    publicReportQueryOptions(code, search)
  );

  // The loader already raised notFound() for this; the guard is for types.
  if (!report) return null;

  const { linkName, transactions, total, previousTotal, filterCategories } =
    report;

  // A single month is expressed as fromMonth === toMonth, which keeps the URL
  // contract unchanged and means the server needs no new search parameter.
  const month =
    search.fromMonth && search.fromMonth === search.toMonth
      ? search.fromMonth
      : null;

  return (
    <PublicShell>
      <ReportBody
        linkName={linkName}
        transactions={transactions}
        total={total}
        previousTotal={previousTotal}
        filterCategories={filterCategories}
        month={month}
        category={search.category}
        onMonthChange={(next) =>
          void navigate({
            search: (prev) => ({
              ...prev,
              fromMonth: next ?? undefined,
              toMonth: next ?? undefined,
            }),
          })
        }
        onCategoryChange={(next) =>
          void navigate({
            search: (prev) => ({ ...prev, category: next ?? undefined }),
          })
        }
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
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words">
            {linkName || "Báo cáo chi tiêu"}
          </h1>
          <p className="text-muted-foreground">Báo cáo được chia sẻ với bạn</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground">Giao diện</span>
          <ThemeToggle />
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
       * repeated its whole "A / B / C" path — the one control on this page that
       * had not been brought up to the rest.
       */}
      {filterCategories.length > 1 && (
        <div className="space-y-1.5">
          <Label>Xem theo nhóm</Label>
          <CategoryPickerField
            categories={filterCategories}
            value={category ?? null}
            onChange={(id) => onCategoryChange(id)}
            // Picking a parent means its whole subtree, intersected server-side
            // with what this link is allowed to show.
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
           * wrapping it in a separate collapsible produced a button and then a
           * visibly separate card below it, and Recharts measured its width
           * while that wrapper was still at zero height, which pushed the page
           * sideways when it opened.
           *
           * One instance, not one per breakpoint: two would mount two Recharts
           * trees and leave one of them measuring a hidden container.
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
