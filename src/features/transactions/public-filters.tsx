"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { MonthRangeFilter } from "./month-range-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_VALUE = "__all__";

interface CategoryOption {
  id: string;
  label: string;
}

export function PublicFilters({
  code,
  categories,
}: {
  code: string;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      router.push(`/p/${code}?${params.toString()}`);
    },
    [router, searchParams, code]
  );

  const fromMonth = searchParams.get("fromMonth");
  const toMonth = searchParams.get("toMonth");
  const category = searchParams.get("category");

  return (
    <div className="flex flex-wrap gap-2">
      <MonthRangeFilter
        fromMonth={fromMonth}
        toMonth={toMonth}
        onChange={(from, to) => {
          updateFilters({ fromMonth: from, toMonth: to });
        }}
      />

      {categories.length > 1 && (
        <Select
          value={category ?? ALL_VALUE}
          onValueChange={(v) =>
            updateFilters({ category: v === ALL_VALUE ? null : v })
          }
        >
          <SelectTrigger className="w-[180px]">
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
