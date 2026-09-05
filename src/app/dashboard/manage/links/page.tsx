import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getPurposes, getShareLinks } from "@/lib/db/queries";
import { getQueryClient } from "@/lib/query-client";
import {
  purposesQueryOptions,
  shareLinksQueryOptions,
} from "@/lib/query-options";
import { LinksView } from "./links-view";

export default async function LinksPage() {
  const queryClient = getQueryClient();
  const [purposes, links] = await Promise.all([getPurposes(), getShareLinks()]);
  queryClient.setQueryData(purposesQueryOptions().queryKey, purposes);
  queryClient.setQueryData(shareLinksQueryOptions().queryKey, links);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LinksView />
    </HydrationBoundary>
  );
}
