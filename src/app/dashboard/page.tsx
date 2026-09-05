import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getCurrentMonth } from "@/lib/format";
import { getQueryClient } from "@/lib/query-client";
import { overviewQueryOptions } from "@/lib/query-options";
import { readOverviewSearch } from "@/lib/search-params";
import { getOverview } from "@/server/overview.queries";
import { OverviewView } from "./overview-view";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { month: parsedMonth } = readOverviewSearch(raw);
  const month = parsedMonth ?? getCurrentMonth();

  const queryClient = getQueryClient();
  // Calls the plain function directly rather than fetching `/api/overview` —
  // fetching here would be a self-fetch from this server back to itself. See
  // `src/lib/query-options.ts`'s header comment.
  const data = await getOverview(month);
  queryClient.setQueryData(overviewQueryOptions(month).queryKey, data);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OverviewView month={month} />
    </HydrationBoundary>
  );
}
