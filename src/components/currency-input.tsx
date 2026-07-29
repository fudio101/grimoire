import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const GROUPING = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/**
 * VND has no subunit in practice, so this is an integer field that happens to
 * show separators. Kept as `type="text"` with `inputMode="numeric"`: a real
 * `type="number"` would fight the grouping dots, expose spinner arrows nobody
 * wants on a phone, and silently drop the value on some browsers when the text
 * is momentarily unparseable mid-edit.
 *
 * `size="lg"` is what the transaction sheet uses — amount is the first thing you
 * type and the only field worth making large.
 */
export function CurrencyInput({
  value,
  onChange,
  id,
  size = "default",
  className,
  ...props
}: {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  size?: "default" | "lg";
} & Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "onChange" | "name" | "size"
>) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d]/g, "");
    onChange(digits ? Number(digits) : 0);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value ? GROUPING.format(value) : ""}
        onChange={handleChange}
        className={cn(
          // Room for the ₫ so long amounts never slide under it.
          "pr-9 tabular-nums",
          size === "lg" &&
            "h-14 pr-11 text-2xl font-semibold md:h-14 md:text-2xl",
          className
        )}
        {...props}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted-foreground",
          size === "lg" && "right-4 text-2xl"
        )}
      >
        ₫
      </span>
    </div>
  );
}
