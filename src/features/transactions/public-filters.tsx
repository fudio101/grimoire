import { getRouteApi } from "@tanstack/react-router";
import { MonthRangeFilter } from "./month-range-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_VALUE = "__all__";

const routeApi = getRouteApi("/p/$code");

interface CategoryOption {
  id: string;
  label: string;
}

export function PublicFilters({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const { fromMonth, toMonth, category } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  return (
    <div className="flex flex-wrap gap-2">
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

      {categories.length > 1 && (
        <Select
          value={category ?? ALL_VALUE}
          onValueChange={(v) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                category: v === ALL_VALUE ? undefined : (v ?? undefined),
              }),
            })
          }
        >
          <SelectTrigger className="min-w-[180px]">
            <SelectValue placeholder="Tất cả danh mục">
              {(value) => {
                if (!value || value === ALL_VALUE) return "Tất cả danh mục";
                return categories.find((c) => c.id === value)?.label ?? value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tất cả danh mục</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
