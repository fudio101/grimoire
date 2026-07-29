import { useMemo } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatVND } from "@/lib/format";
import { PublicFilters } from "@/features/transactions/public-filters";
import { ExpenseChart } from "@/features/transactions/expense-chart";
import { TransactionDataTable } from "@/features/transactions/transaction-data-table";
import { transactionColumns } from "@/features/transactions/columns";
import { publicReportQueryOptions } from "@/lib/query-options";

const searchSchema = z.object({
  fromMonth: z.string().optional(),
  toMonth: z.string().optional(),
  category: z.string().optional(),
});

export const Route = createFileRoute("/p/$code")({
  validateSearch: searchSchema,
  // Without this the loader is keyed on the pathname alone, so changing a
  // filter would update the URL while the loader quietly never re-ran.
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    const report = await context.queryClient.ensureQueryData(
      publicReportQueryOptions(params.code, deps)
    );
    if (!report) throw notFound();
  },
  component: PublicView,
  notFoundComponent: LinkNotFound,
});

function LinkNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        Không tìm thấy liên kết
      </h1>
      <p className="text-sm text-muted-foreground">
        Liên kết này không tồn tại hoặc đã bị tắt.
      </p>
    </div>
  );
}

function PublicView() {
  const { code } = Route.useParams();
  const search = Route.useSearch();
  const { data: report } = useSuspenseQuery(
    publicReportQueryOptions(code, search)
  );

  // No handlers passed, so the actions column has nothing to render and is
  // hidden below — one column definition, two routes.
  const columns = useMemo(() => transactionColumns(), []);

  // The loader already raised notFound() for this; the guard is for types.
  if (!report) return null;

  const { linkName, transactions, total, filterOptions } = report;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/*
       * The reader of a shared link never signs in, so this is their only way
       * to control the theme. Labelled rather than icon-only: this page is read
       * by people who should not have to infer what a sun glyph does.
       */}
      <div className="mb-4 flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">Giao diện</span>
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {linkName || "Báo cáo chi tiêu"}
              </CardTitle>
              <CardDescription>Báo cáo chi tiêu</CardDescription>
            </div>
            <Badge variant="secondary" className="px-4 py-1 text-lg">
              {formatVND(total)}
            </Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-4">
          <PublicFilters categories={filterOptions} />

          <ExpenseChart transactions={transactions} />

          <TransactionDataTable
            data={transactions}
            columns={columns}
            showActions={false}
            emptyMessage="Chưa có giao dịch nào."
          />
        </CardContent>
      </Card>
    </div>
  );
}
