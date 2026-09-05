import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  getFundingSources,
  getPurposes,
  getTransactions,
} from "@/lib/db/queries";
import { getQueryClient } from "@/lib/query-client";
import {
  fundingSourcesQueryOptions,
  purposesQueryOptions,
  transactionsQueryOptions,
} from "@/lib/query-options";
import { readTransactionSearch } from "@/lib/search-params";
import { TransactionsView } from "./transactions-view";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const search = readTransactionSearch(raw);

  const queryClient = getQueryClient();
  // Direct db.queries.ts calls, not `/api/*` fetches — see the plan's
  // self-fetch note in src/lib/query-options.ts's header comment.
  const [purposes, fundingSources, transactions] = await Promise.all([
    getPurposes(),
    getFundingSources(),
    getTransactions({
      fromMonth: search.fromMonth,
      toMonth: search.toMonth,
      purposeId: search.purpose,
      fundingSourceId: search.fundingSource,
    }),
  ]);
  queryClient.setQueryData(purposesQueryOptions().queryKey, purposes);
  queryClient.setQueryData(
    fundingSourcesQueryOptions().queryKey,
    fundingSources
  );
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
