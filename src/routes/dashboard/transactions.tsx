import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { TransactionTable } from "@/features/transactions/transaction-table";
import { TransactionFilters } from "@/features/transactions/transaction-filters";
import { AddTransactionButton } from "@/features/transactions/add-transaction-button";
import { ExpenseChart } from "@/features/transactions/expense-chart";
import { formatVND } from "@/lib/format";
import {
  categoriesQueryOptions,
  transactionsQueryOptions,
} from "@/lib/query-options";
import { parseTransactionSearch } from "@/lib/search-params";

export const Route = createFileRoute("/dashboard/transactions")({
  validateSearch: parseTransactionSearch,
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
  const navigate = Route.useNavigate();
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
        {/* Mobile reaches this through the floating button in the app shell,
            which is available from every tab — a second copy here would just
            push the list further down the screen. */}
        <div className="hidden md:block">
          <AddTransactionButton categories={categories} />
        </div>
      </div>

      <TransactionFilters
        categories={categories}
        fromMonth={search.fromMonth}
        toMonth={search.toMonth}
        category={search.category}
        onMonthChange={(fromMonth, toMonth) =>
          // undefined drops the key from the URL, matching the old
          // URLSearchParams.delete() behaviour.
          void navigate({
            search: (prev) => ({
              ...prev,
              fromMonth: fromMonth ?? undefined,
              toMonth: toMonth ?? undefined,
            }),
          })
        }
        onCategoryChange={(category) =>
          void navigate({
            search: (prev) => ({ ...prev, category: category ?? undefined }),
          })
        }
      />

      <ExpenseChart transactions={transactions} />

      <TransactionTable transactions={transactions} categories={categories} />
    </div>
  );
}
