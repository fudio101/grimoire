"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { flattenWithDepth, getDescendantIds } from "@/lib/category-tree";
import type { Category } from "@/lib/db/schema";

interface CategoryTreeSelectProps {
  categories: Category[];
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Tri-state checkbox tree. Selection is stored as an explicit set of category
 * ids (a node plus all its descendants when a parent is checked). A parent
 * renders checked when its whole subtree is selected, indeterminate when only
 * part of it is.
 */
export function CategoryTreeSelect({
  categories,
  value,
  onChange,
}: CategoryTreeSelectProps) {
  const selected = useMemo(() => new Set(value), [value]);
  const rows = useMemo(() => flattenWithDepth(categories), [categories]);

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Chưa có danh mục nào. Hãy tạo danh mục trước.
      </p>
    );
  }

  const subtreeOf = (id: string) => [id, ...getDescendantIds(id, categories)];

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    const ids = subtreeOf(id);
    if (checked) {
      ids.forEach((i) => next.add(i));
    } else {
      ids.forEach((i) => next.delete(i));
    }
    onChange([...next]);
  };

  return (
    <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
      {rows.map(({ category, depth }) => {
        const ids = subtreeOf(category.id);
        const count = ids.filter((i) => selected.has(i)).length;
        const checked = count === ids.length;
        const indeterminate = count > 0 && !checked;

        return (
          <label
            key={category.id}
            className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            style={{ marginLeft: depth * 20 }}
          >
            <Checkbox
              checked={checked}
              indeterminate={indeterminate}
              onCheckedChange={(next) => toggle(category.id, next)}
            />
            <span>{category.name}</span>
          </label>
        );
      })}
    </div>
  );
}
