"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { MonthRangeFilter } from "./month-range-filter";

export function PublicFilters({ shareToken }: { shareToken: string }) {
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
      router.push(`/p/${shareToken}?${params.toString()}`);
    },
    [router, searchParams, shareToken]
  );

  const fromMonth = searchParams.get("fromMonth");
  const toMonth = searchParams.get("toMonth");

  return (
    <div className="flex flex-wrap gap-2">
      <MonthRangeFilter
        fromMonth={fromMonth}
        toMonth={toMonth}
        onChange={(from, to) => {
          updateFilters({
            fromMonth: from,
            toMonth: to,
          });
        }}
      />
    </div>
  );
}
