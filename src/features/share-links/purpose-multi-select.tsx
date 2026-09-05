import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Purpose } from "@/lib/db/schema";

/**
 * A flat checkbox list of Purposes — a share link's whole scope (ADR-0002).
 *
 * This replaces a tri-state checkbox tree whose entire complexity came from
 * the hierarchy: checking a parent had to select its descendants, a parent
 * rendered indeterminate when only part of its subtree was selected, and the
 * stored value was a set that mixed both levels. Flat options are checked or
 * they are not, so there is no third state to arithmetic into existence — and
 * no way for a scope to mean something other than what is ticked.
 */
export function PurposeMultiSelect({
  purposes,
  value,
  onChange,
}: {
  purposes: Purpose[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = useMemo(() => new Set(value), [value]);

  if (purposes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có mục đích chi nào. Hãy tạo mục đích chi trước.
      </p>
    );
  }

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange([...next]);
  };

  return (
    <div className="max-h-80 space-y-0.5 overflow-y-auto rounded-md border p-2">
      {purposes.map((purpose) => (
        <label
          key={purpose.id}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-accent md:min-h-10"
        >
          <Checkbox
            checked={selected.has(purpose.id)}
            onCheckedChange={(next) => toggle(purpose.id, next)}
          />
          <span>{purpose.name}</span>
        </label>
      ))}
    </div>
  );
}
