import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMonths, formatMonthLabel, getCurrentMonth } from "@/lib/format";

/**
 * Month navigation for the shared report.
 *
 * Larger and plainer than the dashboard's stepper, and it says "Tháng trước" /
 * "Tháng sau" in words rather than relying on the arrows alone. The reader here
 * did not choose this app and may never have used it before; an unlabelled
 * chevron is a guess, not an affordance.
 *
 * This replaces a popover holding a two-year grid and an English quick-select
 * column — a control that assumed someone wanted to think about date ranges.
 */
export function PublicMonthStepper({
  month,
  onChange,
}: {
  month: string | null;
  onChange: (month: string | null) => void;
}) {
  const current = getCurrentMonth();
  const active = month ?? current;
  const atCurrent = active >= current;

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <Button
          variant="outline"
          className="h-14 flex-1 flex-col gap-0 px-2"
          onClick={() => onChange(addMonths(active, -1))}
        >
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <ChevronLeft className="size-4" />
            Tháng trước
          </span>
        </Button>

        <div
          aria-live="polite"
          className="flex h-14 flex-[1.4] items-center justify-center rounded-lg border border-input bg-muted/40 px-2 text-center font-semibold"
        >
          {month ? formatMonthLabel(month) : "Tất cả thời gian"}
        </div>

        <Button
          variant="outline"
          className="h-14 flex-1 flex-col gap-0 px-2"
          disabled={atCurrent && month !== null}
          onClick={() => onChange(addMonths(active, 1))}
        >
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            Tháng sau
            <ChevronRight className="size-4" />
          </span>
        </Button>
      </div>

      <div className="text-center">
        {month ? (
          <Button variant="link" onClick={() => onChange(null)}>
            Xem tất cả thời gian
          </Button>
        ) : (
          <Button variant="link" onClick={() => onChange(current)}>
            Chỉ xem tháng này
          </Button>
        )}
      </div>
    </div>
  );
}
