import { Suspense } from "react";
import { getCategories, getTransactions } from "@/lib/db/queries";
import { TransactionTable } from "@/features/transactions/transaction-table";
import { TransactionFilters } from "@/features/transactions/transaction-filters";
import { AddTransactionButton } from "@/features/transactions/add-transaction-button";
import { ExpenseChart } from "@/features/transactions/expense-chart";
import { formatVND } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    fromMonth?: string;
    toMonth?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const [categories, transactions] = await Promise.all([
    getCategories(),
    getTransactions({
      fromMonth: params.fromMonth,
      toMonth: params.toMonth,
      categoryId: params.category,
    }),
  ]);

  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Giao dịch</h1>
          <p className="text-muted-foreground text-sm">
            Tổng cộng: {formatVND(total)}
          </p>
        </div>
        <AddTransactionButton categories={categories} />
      </div>

      <Suspense>
        <TransactionFilters categories={categories} />
      </Suspense>

      <ExpenseChart transactions={transactions} />

      <TransactionTable transactions={transactions} categories={categories} />
    </div>
  );
}
