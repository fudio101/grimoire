import { getRouteApi } from "@tanstack/react-router";
import { CategoryPickerField } from "@/features/categories/category-picker";
import type { Category } from "@/lib/db/schema";
import { MonthRangeFilter } from "./month-range-filter";

const routeApi = getRouteApi("/dashboard/transactions");

export function TransactionFilters({ categories }: { categories: Category[] }) {
  const { fromMonth, toMonth, category } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <MonthRangeFilter
        fromMonth={fromMonth ?? null}
        toMonth={toMonth ?? null}
        onChange={(from, to) => {
          // undefined drops the key from the URL, matching the old
          // URLSearchParams.delete() behaviour.
          void navigate({
            search: (prev) => ({
              ...prev,
              fromMonth: from ?? undefined,
              toMonth: to ?? undefined,
            }),
          });
        }}
      />

      {/*
       * Any node is selectable here, not just leaves: filtering by a parent
       * means its whole subtree, which is what getTransactions already does.
       */}
      <CategoryPickerField
        categories={categories}
        value={category ?? null}
        onChange={(id) =>
          void navigate({
            search: (prev) => ({ ...prev, category: id ?? undefined }),
          })
        }
        selectable="all"
        clearLabel="Tất cả danh mục"
        placeholder="Tất cả danh mục"
        title="Lọc theo danh mục"
        className="sm:w-[240px]"
      />
    </div>
  );
}
