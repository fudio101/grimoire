import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getShareLinkByCode,
  getTransactionsForCategories,
  getTotalForCategories,
  getCategories,
  expandCategorySubtree,
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
import { getCategoryPath, getCategoryPathParts } from "@/lib/category-tree";

export default async function PublicView({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    fromMonth?: string;
    toMonth?: string;
    category?: string;
  }>;
}) {
  const { code } = await params;
  const filters = await searchParams;
  const result = await getShareLinkByCode(code);

  if (!result) {
    notFound();
  }

  const { link, categoryIds } = result;
  const linkSet = new Set(categoryIds);

  const fromMonth = filters.fromMonth;
  const toMonth = filters.toMonth;

  // Drill-down filter: narrow to one picked category's subtree within the link.
  let effectiveIds = categoryIds;
  const picked = filters.category;
  if (picked && linkSet.has(picked)) {
    const subtree = await expandCategorySubtree(picked);
    effectiveIds = subtree.filter((id) => linkSet.has(id));
  }

  const [allCategories, transactions, total] = await Promise.all([
    getCategories(),
    getTransactionsForCategories(effectiveIds, { fromMonth, toMonth }),
    getTotalForCategories(effectiveIds, { fromMonth, toMonth }),
  ]);

  const filterOptions = categoryIds
    .map((id) => ({ id, label: getCategoryPath(id, allCategories) }))
    .filter((o) => o.label)
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {link.name || "Báo cáo chi tiêu"}
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
          <Suspense>
            <PublicFilters code={code} categories={filterOptions} />
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
                    <TableHead>Danh mục</TableHead>
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
                      <TableCell className="whitespace-nowrap">
                        {(() => {
                          const path = getCategoryPathParts(
                            tx.categoryId,
                            allCategories
                          );
                          if (path.length === 0) return tx.categoryName ?? "—";
                          const leaf = path[path.length - 1];
                          const parents = path.slice(0, -1);
                          return (
                            <>
                              {parents.length > 0 && (
                                <span className="text-muted-foreground">
                                  {parents.join(" › ")} ›{" "}
                                </span>
                              )}
                              {leaf}
                            </>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
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
