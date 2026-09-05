import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getPurposes } from "@/lib/db/queries";
import { getQueryClient } from "@/lib/query-client";
import { purposesQueryOptions } from "@/lib/query-options";
import { PurposesView } from "./purposes-view";

export default async function PurposesPage() {
  const queryClient = getQueryClient();
  queryClient.setQueryData(
    purposesQueryOptions().queryKey,
    await getPurposes()
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PurposesView />
    </HydrationBoundary>
  );
}
