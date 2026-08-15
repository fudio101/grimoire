"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AddTransactionButton } from "@/features/transactions/add-transaction-button";
import { ExpenseChart } from "@/features/transactions/expense-chart";
import { TransactionFilters } from "@/features/transactions/transaction-filters";
import { TransactionTable } from "@/features/transactions/transaction-table";
import { useDelayedPending } from "@/hooks/use-delayed-pending";
import { formatVND } from "@/lib/format";
import {
  categoriesQueryOptions,
  transactionsQueryOptions,
} from "@/lib/query-options";
import type { TransactionSearch } from "@/lib/search-params";
import { cn } from "@/lib/utils";

function buildHref(next: Partial<TransactionSearch>): string {
  const params = new URLSearchParams();
  if (next.fromMonth) params.set("fromMonth", next.fromMonth);
  if (next.toMonth) params.set("toMonth", next.toMonth);
  if (next.category) params.set("category", next.category);
  const qs = params.toString();
  return qs ? `/dashboard/transactions?${qs}` : "/dashboard/transactions";
}

export function TransactionsView({ search }: { search: TransactionSearch }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showPending = useDelayedPending(isPending);
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const { data: transactions } = useSuspenseQuery(
    transactionsQueryOptions(search)
  );

  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Non-shallow: a real router.push is what makes this page's server
  // component (and therefore its own prefetch) rerun under the new key —
  // there is no shallow-routing primitive in the App Router that also does
  // that.
  function navigate(next: Partial<TransactionSearch>) {
    startTransition(() => {
      router.push(buildHref({ ...search, ...next }), { scroll: false });
    });
  }

  return (
    <div
      aria-busy={showPending}
      className={cn(
        "space-y-6 transition-opacity",
        showPending && "opacity-60"
      )}
    >
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
          navigate({
            fromMonth: fromMonth ?? undefined,
            toMonth: toMonth ?? undefined,
          })
        }
        onCategoryChange={(category) =>
          navigate({ category: category ?? undefined })
        }
      />

      <ExpenseChart transactions={transactions} />

      <TransactionTable transactions={transactions} categories={categories} />
    </div>
  );
}
