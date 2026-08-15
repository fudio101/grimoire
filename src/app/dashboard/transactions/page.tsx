import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getCategories, getTransactions } from "@/lib/db/queries";
import { getQueryClient } from "@/lib/query-client";
import {
  categoriesQueryOptions,
  transactionsQueryOptions,
} from "@/lib/query-options";
import { parseTransactionSearch, pickSearchParam } from "@/lib/search-params";
import { TransactionsView } from "./transactions-view";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const search = parseTransactionSearch({
    fromMonth: pickSearchParam(raw.fromMonth),
    toMonth: pickSearchParam(raw.toMonth),
    category: pickSearchParam(raw.category),
  });

  const queryClient = getQueryClient();
  // Direct db.queries.ts calls, not `/api/*` fetches — see the plan's
  // self-fetch note in src/lib/query-options.ts's header comment.
  const [categories, transactions] = await Promise.all([
    getCategories(),
    getTransactions({
      fromMonth: search.fromMonth,
      toMonth: search.toMonth,
      categoryId: search.category,
    }),
  ]);
  queryClient.setQueryData(categoriesQueryOptions().queryKey, categories);
  queryClient.setQueryData(
    transactionsQueryOptions(search).queryKey,
    transactions
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransactionsView search={search} />
    </HydrationBoundary>
  );
}
