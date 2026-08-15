import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getCategories } from "@/lib/db/queries";
import { getQueryClient } from "@/lib/query-client";
import { categoriesQueryOptions } from "@/lib/query-options";
import { CategoriesView } from "./categories-view";

export default async function CategoriesPage() {
  const queryClient = getQueryClient();
  const categories = await getCategories();
  queryClient.setQueryData(categoriesQueryOptions().queryKey, categories);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CategoriesView />
    </HydrationBoundary>
  );
}
