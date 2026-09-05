import "server-only";
import {
  getFundingSourcesForPurposes,
  getShareLinkByCode,
  getTotalForPurposes,
  getTransactionsForPurposes,
  getPurposes,
} from "@/lib/db/queries";
import { addMonths } from "@/lib/format";
import type { PublicReportSearch } from "@/lib/schemas";
import type { PublicReport } from "@/lib/types";

/**
 * Everything /p/[code] renders, in one call, with no auth — one of only three
 * public surfaces in the app (the others are `login` and `/api/health`).
 *
 * Called both by `app/api/public-report/route.ts` (for client refetches, no
 * auth check there either — see that file for why) and directly by the
 * public report page's server component during prefetch.
 *
 * The response carries only what the link's own scope justifies. That used to
 * take real work: the whole category table was read to build filter labels and
 * per-row breadcrumbs, then re-parented and truncated so no ancestor the
 * visitor was never granted could appear in either. A flat scope has no
 * ancestors, so all of that is gone rather than ported.
 */
export async function getPublicReport(
  input: PublicReportSearch & { code: string }
): Promise<PublicReport | null> {
  const result = await getShareLinkByCode(input.code);
  // Returning null rather than throwing notFound(): the caller (the Route
  // Handler, or the page's own prefetch) decides how to answer "not found".
  if (!result) return null;

  const { link, purposeIds } = result;

  /**
   * A link with no Purposes in scope is not a link that shows nothing — it is
   * a link that cannot show anything, and answering with an empty report would
   * present it as a healthy link on a month with no spending. The reader would
   * be told to keep checking a URL that will never show them anything.
   *
   * Reachable: deleting an unused Purpose detaches it from every link naming
   * it, and the migration leaves an empty scope behind for a link that pointed
   * only at a pot never spent from. Answering `null` — the same "no report"
   * every unknown or disabled code gets — is both honest and fail-closed.
   */
  if (purposeIds.length === 0) return null;

  const linkSet = new Set(purposeIds);

  /**
   * The drill-down filter, intersected with the link's own scope.
   *
   * This is the security boundary, and it is deliberately written as
   * "narrow only if the requested Purpose is already in scope" rather than
   * "narrow, then check": a hand-crafted `?purpose=` naming something outside
   * the link falls through to the link's full scope instead of widening it.
   * Preserved verbatim from the tree version, where it also had to survive a
   * subtree expansion; the flat model just removes the expansion.
   */
  const effectiveIds =
    input.purpose && linkSet.has(input.purpose) ? [input.purpose] : purposeIds;

  /**
   * The Funding Source filter is *not* intersected with anything, because
   * there is nothing to intersect it with: scope is a set of Purposes
   * (ADR-0002), and a Funding Source can only remove rows from that set,
   * never add one. An id naming no pot yields an honest empty view, which
   * the chips render as a stale filter rather than as "everything".
   */
  const range = {
    fromMonth: input.fromMonth,
    toMonth: input.toMonth,
    fundingSourceId: input.fundingSource,
  };

  // Only a single-month view has a meaningful "previous month".
  const singleMonth =
    input.fromMonth && input.fromMonth === input.toMonth
      ? input.fromMonth
      : null;
  const previousMonth = singleMonth ? addMonths(singleMonth, -1) : null;

  const [rows, total, previousTotal, allPurposes, filterFundingSources] =
    await Promise.all([
      getTransactionsForPurposes(effectiveIds, range),
      getTotalForPurposes(effectiveIds, range),
      previousMonth
        ? getTotalForPurposes(effectiveIds, {
            fromMonth: previousMonth,
            toMonth: previousMonth,
            fundingSourceId: input.fundingSource,
          })
        : Promise.resolve(null),
      getPurposes(),
      // Over the link's whole scope, not the narrowed view: the chips must
      // stay put while the reader taps between them.
      getFundingSourcesForPurposes(purposeIds),
    ]);

  // Exactly the link's own Purposes, in the order a picker should show them.
  // Filtering the full list rather than joining keeps this one query, and the
  // filter is what stops anything outside `linkSet` reaching the client.
  const filterPurposes = allPurposes
    .filter((p) => linkSet.has(p.id))
    .map((p) => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return {
    linkName: link.name,
    total,
    previousTotal,
    filterPurposes,
    filterFundingSources,
    transactions: rows,
  };
}
