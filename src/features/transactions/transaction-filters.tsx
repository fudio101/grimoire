import { getRouteApi } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { flattenWithDepth, getCategoryPath } from "@/lib/category-tree";
import type { Category } from "@/lib/db/schema";
import { MonthRangeFilter } from "./month-range-filter";

const routeApi = getRouteApi("/dashboard/");

export function TransactionFilters({ categories }: { categories: Category[] }) {
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

      <Select
        value={category ?? "all"}
        onValueChange={(v) =>
          void navigate({
            search: (prev) => ({
              ...prev,
              category: !v || v === "all" ? undefined : v,
            }),
          })
        }
      >
        <SelectTrigger className="min-w-[180px]">
          <SelectValue placeholder="Tất cả danh mục">
            {(value) => {
              if (!value || value === "all") return "Tất cả danh mục";
              return (
                getCategoryPath(String(value), categories) || "Tất cả danh mục"
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả danh mục</SelectItem>
          {/* Full path rather than an indented name: repeated spaces collapse in
              HTML, so depth was invisible and a child read as a root. This also
              matches the trigger, which shows the path. */}
          {flattenWithDepth(categories).map(({ category: cat }) => (
            <SelectItem key={cat.id} value={cat.id}>
              {getCategoryPath(cat.id, categories)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
