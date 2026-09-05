import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type DimensionOption = { id: string; name: string };

/**
 * One flat list, one choice. Used for both dimensions, on the form and on the
 * filter, because a Purpose and a Funding Source are picked exactly the same
 * way — a flat set of names with no nesting to drill into.
 *
 * This replaces a 400-line modal drill-down picker that existed only because
 * the options were a tree. On the filter rows it has since been replaced in
 * turn by `DimensionChips`; it remains the picker on the transaction form,
 * where the choice is required and has no "everything" answer, so a chip row
 * would be a different control pretending to be the same one.
 *
 * `emptyOption`, when given, is the "no choice / everything" entry. Base UI's
 * Select cannot carry an empty-string item value, so it is modelled as `null`
 * and mapped to the sentinel below only for the duration of the round-trip —
 * and *only* where an empty option exists. Where one does not, `null` is
 * passed straight through, because Base UI derives `data-placeholder` from
 * `value != null` (SelectRoot) and the sentinel would defeat it: the two
 * required selects on the transaction form would render their prompt in full
 * foreground colour, reading as answered until the form refused to submit.
 *
 * The trigger's label is resolved by an explicit `SelectValue` children
 * function rather than left to `placeholder`. Base UI reads a trigger label
 * from the Root's `items` prop, from `itemToStringLabel`, or from exactly this
 * function — a rendered `<SelectItem>` does *not* register its text anywhere
 * the trigger can find. Without one it falls back to serialising the value, so
 * every select rendered its sentinel (`__none__`) and then, once something was
 * picked, a raw id. `placeholder` cannot cover for that either: the sentinel
 * counts as a selected value, so it never engages.
 */
const NONE = "__none__";

export function DimensionSelect({
  options,
  value,
  onChange,
  label,
  placeholder,
  emptyOption,
  unknownLabel,
  ariaLabel,
  id,
  className,
  triggerClassName,
}: {
  options: DimensionOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder: string;
  /** Label for the "no choice" entry. Omit to make a choice mandatory. */
  emptyOption?: string;
  /**
   * Shown when `value` names no option — a filter left in a URL after the
   * thing it named was renamed or deleted, say. Distinct from `emptyOption`
   * on purpose: on the filter row those two would otherwise be the same
   * string, so a select actively filtering to zero rows would read exactly
   * like one filtering nothing.
   */
  unknownLabel?: string;
  /** Accessible name where no visible `<Label>` points at this control. */
  ariaLabel?: string;
  id?: string;
  /** Layout for the wrapper. */
  className?: string;
  /** Sizing for the control itself — the wrapper cannot set its height. */
  triggerClassName?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Select
        value={emptyOption ? (value ?? NONE) : value}
        onValueChange={(next) =>
          onChange(next === NONE || next === null ? null : String(next))
        }
      >
        <SelectTrigger
          id={id}
          aria-label={ariaLabel}
          className={cn("w-full", triggerClassName)}
        >
          <SelectValue placeholder={placeholder}>
            {(selected) => {
              if (selected === NONE || selected == null) {
                return emptyOption ?? placeholder;
              }
              return (
                options.find((option) => option.id === selected)?.name ??
                unknownLabel ??
                placeholder
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {emptyOption && <SelectItem value={NONE}>{emptyOption}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
