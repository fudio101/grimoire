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
 * the options were a tree. #138 replaces it again with tappable chips; a plain
 * select is the deliberately unremarkable middle step that keeps the app
 * working while the model changes underneath it.
 *
 * `emptyOption`, when given, is the "no choice / everything" entry. Base UI's
 * Select cannot carry an empty-string item value, so it is modelled as `null`
 * and mapped to the sentinel below only for the duration of the round-trip.
 */
const NONE = "__none__";

export function DimensionSelect({
  options,
  value,
  onChange,
  label,
  placeholder,
  emptyOption,
  id,
  className,
}: {
  options: DimensionOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder: string;
  /** Label for the "no choice" entry. Omit to make a choice mandatory. */
  emptyOption?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Select
        value={value ?? NONE}
        onValueChange={(next) =>
          onChange(next === NONE || next === null ? null : String(next))
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
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
