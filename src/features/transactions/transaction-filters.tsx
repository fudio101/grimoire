import { DimensionChips } from "@/features/dimensions/dimension-chips";
import {
  FUNDING_SOURCE_COPY,
  PURPOSE_COPY,
} from "@/features/dimensions/dimension-copy";
import type { FundingSource, Purpose } from "@/lib/db/schema";
import { MonthRangeFilter } from "./month-range-filter";

/**
 * Driven entirely by props rather than reading `/dashboard/transactions`'s
 * own search state directly: the caller owns navigation via `router.push`.
 *
 * Two rows of chips, one per dimension, each with its own "everything" chip.
 * Every option is on screen at once and any of them is one tap away — the
 * shape #131 asked for, replacing the two selects that stood in while the
 * model changed underneath them. Under the tree before that, this was one
 * control that could not express the question the user actually had — the
 * same Purpose lived in two branches, so no single value selected it — and
 * clearing it was the only way out of a narrowed view.
 *
 * The Funding Source half is optional so this can serve a caller that has only
 * one dimension to offer. `/p/[code]` is that case in principle — a share
 * link's scope is one-dimensional (ADR-0002), so offering a filter the query
 * ignores would be a lie — but it composes its own controls, since its month
 * stepper differs. Both surfaces render the same `DimensionChips`, so the
 * shape is shared even though this wrapper is not.
 */
export function TransactionFilters({
  purposes,
  fundingSources,
  fromMonth,
  toMonth,
  purpose,
  fundingSource,
  onMonthChange,
  onPurposeChange,
  onFundingSourceChange,
}: {
  purposes: Purpose[];
  fundingSources?: FundingSource[];
  fromMonth: string | undefined;
  toMonth: string | undefined;
  purpose: string | undefined;
  fundingSource?: string | undefined;
  onMonthChange: (fromMonth: string | null, toMonth: string | null) => void;
  onPurposeChange: (purpose: string | null) => void;
  onFundingSourceChange?: (fundingSource: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <MonthRangeFilter
        fromMonth={fromMonth ?? null}
        toMonth={toMonth ?? null}
        onChange={onMonthChange}
      />

      <DimensionChips
        options={purposes}
        value={purpose ?? null}
        onChange={onPurposeChange}
        copy={PURPOSE_COPY}
      />

      {fundingSources && onFundingSourceChange && (
        <DimensionChips
          options={fundingSources}
          value={fundingSource ?? null}
          onChange={onFundingSourceChange}
          copy={FUNDING_SOURCE_COPY}
        />
      )}
    </div>
  );
}
