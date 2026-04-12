import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getCategoryByShareToken,
  getTransactionsByCategoryId,
  getCategoryTotal,
} from "@/lib/db/queries";
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
import { formatVND, formatDateTime } from "@/lib/format";
import { PublicFilters } from "@/features/transactions/public-filters";
import { ExpenseChart } from "@/features/transactions/expense-chart";

export default async function PublicView({
  params,
  searchParams,
}: {
  params: Promise<{ shareToken: string }>;
  searchParams: Promise<{ fromMonth?: string; toMonth?: string }>;
}) {
  const { shareToken } = await params;
  const filters = await searchParams;
  const category = await getCategoryByShareToken(shareToken);

  if (!category) {
    notFound();
  }

  const fromMonth = filters.fromMonth;
  const toMonth = filters.toMonth;

  const [transactions, total] = await Promise.all([
    getTransactionsByCategoryId(category.id, { fromMonth, toMonth }),
    getCategoryTotal(category.id, { fromMonth, toMonth }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{category.name}</CardTitle>
              <CardDescription>Báo cáo chi tiêu</CardDescription>
            </div>
            <Badge variant="secondary" className="px-4 py-1 text-lg">
              {formatVND(total)}
            </Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-4">
          <Suspense>
            <PublicFilters shareToken={shareToken} />
          </Suspense>

          <ExpenseChart transactions={transactions} />

          {transactions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Chưa có giao dịch nào.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(tx.date)}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        {tx.note || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatVND(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
