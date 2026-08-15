import { CategoryPickerField } from "@/features/categories/category-picker";
import type { Category } from "@/lib/db/schema";
import { MonthRangeFilter } from "./month-range-filter";

/**
 * Driven entirely by props rather than reading `/dashboard/transactions`'s
 * own search state via `getRouteApi`: the caller owns navigation, which is
 * what lets `/p/$code` reuse the exact same shape for its own month/category
 * controls, and what a future App Router page (no route-context equivalent)
 * can supply too.
 */
export function TransactionFilters({
  categories,
  fromMonth,
  toMonth,
  category,
  onMonthChange,
  onCategoryChange,
}: {
  categories: Category[];
  fromMonth: string | undefined;
  toMonth: string | undefined;
  category: string | undefined;
  onMonthChange: (fromMonth: string | null, toMonth: string | null) => void;
  onCategoryChange: (category: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <MonthRangeFilter
        fromMonth={fromMonth ?? null}
        toMonth={toMonth ?? null}
        onChange={onMonthChange}
      />

      {/*
       * Any node is selectable here, not just leaves: filtering by a parent
       * means its whole subtree, which is what getTransactions already does.
       */}
      <CategoryPickerField
        categories={categories}
        value={category ?? null}
        onChange={onCategoryChange}
        selectable="all"
        clearLabel="Tất cả danh mục"
        placeholder="Tất cả danh mục"
        title="Lọc theo danh mục"
        className="sm:w-[240px]"
      />
    </div>
  );
}
