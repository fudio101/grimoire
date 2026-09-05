"use client";

import { useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AddTransactionButton } from "@/features/transactions/add-transaction-button";
import { ExpenseChart } from "@/features/transactions/expense-chart";
import { TransactionFilters } from "@/features/transactions/transaction-filters";
import { TransactionTable } from "@/features/transactions/transaction-table";
import { useDelayedPending } from "@/hooks/use-delayed-pending";
import { formatVND } from "@/lib/format";
import {
  fundingSourcesQueryOptions,
  purposesQueryOptions,
  transactionsQueryOptions,
} from "@/lib/query-options";
import { toSearchString, type TransactionSearch } from "@/lib/search-params";
import { cn } from "@/lib/utils";

function buildHref(next: Partial<TransactionSearch>): Route {
  const qs = toSearchString(next);
  // Non-literal string: typedRoutes can't validate a query-string-bearing
  // href against its route table, so this is the documented escape hatch.
  return (
    qs ? `/dashboard/transactions?${qs}` : "/dashboard/transactions"
  ) as Route;
}

export function TransactionsView({ search }: { search: TransactionSearch }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showPending = useDelayedPending(isPending);
  const { data: purposes } = useSuspenseQuery(purposesQueryOptions());
  const { data: fundingSources } = useSuspenseQuery(
    fundingSourcesQueryOptions()
  );
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
          <AddTransactionButton
            purposes={purposes}
            fundingSources={fundingSources}
          />
        </div>
      </div>

      <TransactionFilters
        purposes={purposes}
        fundingSources={fundingSources}
        fromMonth={search.fromMonth}
        toMonth={search.toMonth}
        purpose={search.purpose}
        fundingSource={search.fundingSource}
        onMonthChange={(fromMonth, toMonth) =>
          navigate({
            fromMonth: fromMonth ?? undefined,
            toMonth: toMonth ?? undefined,
          })
        }
        onPurposeChange={(purpose) =>
          navigate({ purpose: purpose ?? undefined })
        }
        onFundingSourceChange={(fundingSource) =>
          navigate({ fundingSource: fundingSource ?? undefined })
        }
      />

      <ExpenseChart transactions={transactions} />

      <TransactionTable
        transactions={transactions}
        purposes={purposes}
        fundingSources={fundingSources}
      />
    </div>
  );
}
