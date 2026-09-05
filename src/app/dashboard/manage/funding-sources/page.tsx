import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getFundingSources } from "@/lib/db/queries";
import { getQueryClient } from "@/lib/query-client";
import { fundingSourcesQueryOptions } from "@/lib/query-options";
import { FundingSourcesView } from "./funding-sources-view";

export default async function FundingSourcesPage() {
  const queryClient = getQueryClient();
  queryClient.setQueryData(
    fundingSourcesQueryOptions().queryKey,
    await getFundingSources()
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FundingSourcesView />
    </HydrationBoundary>
  );
}
