import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { TransactionTable } from "@/features/transactions/transaction-table";
import { TransactionFilters } from "@/features/transactions/transaction-filters";
import { AddTransactionButton } from "@/features/transactions/add-transaction-button";
import { ExpenseChart } from "@/features/transactions/expense-chart";
import { formatVND } from "@/lib/format";
import {
  categoriesQueryOptions,
  transactionsQueryOptions,
} from "@/lib/query-options";

const searchSchema = z.object({
  fromMonth: z.string().optional(),
  toMonth: z.string().optional(),
  category: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/")({
  validateSearch: searchSchema,
  // Without this the loader is keyed on the pathname alone, so changing a
  // filter would update the URL while the loader quietly never re-ran.
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(categoriesQueryOptions()),
      context.queryClient.ensureQueryData(transactionsQueryOptions(deps)),
    ]),
  component: DashboardPage,
});

function DashboardPage() {
  const search = Route.useSearch();
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const { data: transactions } = useSuspenseQuery(
    transactionsQueryOptions(search)
  );

  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Giao dịch</h1>
          <p className="text-sm text-muted-foreground">
            Tổng cộng: {formatVND(total)}
          </p>
        </div>
        <AddTransactionButton categories={categories} />
      </div>

      <TransactionFilters categories={categories} />

      <ExpenseChart transactions={transactions} />

      <TransactionTable transactions={transactions} categories={categories} />
    </div>
  );
}
