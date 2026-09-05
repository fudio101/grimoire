import { DimensionSelect } from "@/features/dimensions/dimension-select";
import type { FundingSource, Purpose } from "@/lib/db/schema";
import { MonthRangeFilter } from "./month-range-filter";

/**
 * Driven entirely by props rather than reading `/dashboard/transactions`'s
 * own search state directly: the caller owns navigation via `router.push`.
 *
 * Two independent selects, each clearable back to "everything" on its own.
 * Under the tree this was one control that could not express the question the
 * user actually had — the same Purpose lived in two branches, so no single
 * value selected it — and clearing it was the only way out of a narrowed view.
 *
 * The Funding Source half is optional so this can serve a caller that has only
 * one dimension to offer. `/p/[code]` is that case in principle — a share
 * link's scope is one-dimensional (ADR-0002), so offering a filter the query
 * ignores would be a lie — but it composes its own controls today rather than
 * using this, since its month stepper differs. #138 replaces both selects with
 * tappable chips and is where the two surfaces converge on one shape.
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
        // No visible label on this row — the "everything" text is the only
        // clue — so each control needs an accessible name of its own.
        ariaLabel="Lọc theo mục đích chi"
        options={purposes}
        value={purpose ?? null}
        onChange={onPurposeChange}
        placeholder="Tất cả mục đích chi"
        emptyOption="Tất cả mục đích chi"
        unknownLabel="Mục đích chi không còn tồn tại"
        className="sm:w-[220px]"
      />

      {fundingSources && onFundingSourceChange && (
        <DimensionSelect
          ariaLabel="Lọc theo nguồn tiền"
          options={fundingSources}
          value={fundingSource ?? null}
          onChange={onFundingSourceChange}
          placeholder="Tất cả nguồn tiền"
          emptyOption="Tất cả nguồn tiền"
          unknownLabel="Nguồn tiền không còn tồn tại"
          className="sm:w-[220px]"
        />
      )}
    </div>
  );
}
