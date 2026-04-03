"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/lib/db/schema";
import { MonthRangeFilter } from "./month-range-filter";

export function TransactionFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  const fromMonth = searchParams.get("fromMonth");
  const toMonth = searchParams.get("toMonth");

  const currentCategory = searchParams.get("category") ?? "all";

  return (
    <div className="flex flex-wrap gap-2">
      <MonthRangeFilter
        fromMonth={fromMonth}
        toMonth={toMonth}
        onChange={(from, to) => {
          updateFilter({
            fromMonth: from,
            toMonth: to,
          });
        }}
      />

      <Select
        value={currentCategory}
        onValueChange={(v) =>
          updateFilter({ category: v === "all" ? null : v })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tất cả danh mục">
            {(value) => {
              if (!value || value === "all") return "Tất cả danh mục";
              const cat = categories.find((c) => c.id === value);
              return cat?.name ?? "Tất cả danh mục";
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả danh mục</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
