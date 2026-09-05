import { DimensionSelect } from "@/features/dimensions/dimension-select";
import type { FundingSource, Purpose } from "@/lib/db/schema";
import { MonthRangeFilter } from "./month-range-filter";

/**
 * Driven entirely by props rather than reading `/dashboard/transactions`'s
 * own search state directly: the caller owns navigation via `router.push`,
 * which is what lets `/p/[code]` reuse the same shape for its own controls.
 *
 * Two independent selects, each clearable back to "everything" on its own.
 * Under the tree this was one control that could not express the question the
 * user actually had — the same Purpose lived in two branches, so no single
 * value selected it — and clearing it was the only way out of a narrowed view.
 *
 * `/p/[code]` passes no `fundingSources`, because a share link's scope is
 * one-dimensional (ADR-0002) and offering a filter the query ignores would be
 * a lie in the UI. #138 replaces both selects with tappable chips.
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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <MonthRangeFilter
        fromMonth={fromMonth ?? null}
        toMonth={toMonth ?? null}
        onChange={onMonthChange}
      />

      <DimensionSelect
        options={purposes}
        value={purpose ?? null}
        onChange={onPurposeChange}
        placeholder="Tất cả mục đích chi"
        emptyOption="Tất cả mục đích chi"
        className="sm:w-[220px]"
      />

      {fundingSources && onFundingSourceChange && (
        <DimensionSelect
          options={fundingSources}
          value={fundingSource ?? null}
          onChange={onFundingSourceChange}
          placeholder="Tất cả nguồn tiền"
          emptyOption="Tất cả nguồn tiền"
          className="sm:w-[220px]"
        />
      )}
    </div>
  );
}
