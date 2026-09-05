import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { publicReportQueryOptions } from "@/lib/query-options";
import { SHARE_CODE_SHAPE } from "@/lib/schemas";
import { readPublicReportSearch } from "@/lib/search-params";
import { getPublicReport } from "@/server/public-report.queries";
import { PublicReportView } from "./public-report-view";

export default async function PublicReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;

  // A code that cannot exist gets the same "link not found" screen as one
  // that merely doesn't. Left to `getPublicReport`'s stricter validator it
  // would throw instead, and a mistyped or truncated link would answer with
  // the generic error page — which tells the reader to retry something that
  // will never work, rather than to ask for a new link.
  if (!SHARE_CODE_SHAPE.test(code)) notFound();

  const raw = await searchParams;
  const search = readPublicReportSearch(raw);

  // Direct call, not a fetch to `/api/public-report` — see the self-fetch
  // note in `src/lib/query-options.ts`'s header comment.
  const report = await getPublicReport({ ...search, code });
  if (!report) notFound();

  const queryClient = getQueryClient();
  queryClient.setQueryData(
    publicReportQueryOptions(code, search).queryKey,
    report
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PublicReportView code={code} search={search} />
    </HydrationBoundary>
  );
}
