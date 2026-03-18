"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/lib/db/schema";

export function TransactionFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  const currentCategory = searchParams.get("category") ?? "all";

  return (
    <div className="flex flex-wrap gap-2">
      <Input
        type="month"
        className="w-[180px]"
        value={searchParams.get("month") ?? ""}
        onChange={(e) => updateFilter("month", e.target.value || null)}
      />

      <Select
        value={currentCategory}
        onValueChange={(v) => updateFilter("category", v === "all" ? null : v)}
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
