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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatDateTime, formatVND } from "@/lib/format";
import { PublicFilters } from "@/features/transactions/public-filters";
import { ExpenseChart } from "@/features/transactions/expense-chart";
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

  // The loader already raised notFound() for this; the guard is for types.
  if (!report) return null;

  const { linkName, transactions, total, filterOptions } = report;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
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

          {transactions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Chưa có giao dịch nào.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const path = tx.categoryPathParts;
                    const leaf = path[path.length - 1];
                    const parents = path.slice(0, -1);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(tx.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {path.length === 0 ? (
                            (tx.categoryName ?? "—")
                          ) : (
                            <>
                              {parents.length > 0 && (
                                <span className="text-muted-foreground">
                                  {parents.join(" › ")} ›{" "}
                                </span>
                              )}
                              {leaf}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {tx.note || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatVND(tx.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
