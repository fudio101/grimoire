import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getCategories, getShareLinks } from "@/lib/db/queries";
import { getQueryClient } from "@/lib/query-client";
import {
  categoriesQueryOptions,
  shareLinksQueryOptions,
} from "@/lib/query-options";
import { LinksView } from "./links-view";

export default async function LinksPage() {
  const queryClient = getQueryClient();
  const [categories, links] = await Promise.all([
    getCategories(),
    getShareLinks(),
  ]);
  queryClient.setQueryData(categoriesQueryOptions().queryKey, categories);
  queryClient.setQueryData(shareLinksQueryOptions().queryKey, links);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LinksView />
    </HydrationBoundary>
  );
}
