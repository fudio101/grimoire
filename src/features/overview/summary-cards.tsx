import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The month total is a hero number, not a chart: there is exactly one value and
 * the question is "how much", so a plot would add ink without adding an answer.
 */
export function TotalCard({
  total,
  previousTotal,
  count,
}: {
  total: number;
  previousTotal: number;
  count: number;
}) {
  const delta = total - previousTotal;
  const pct =
    previousTotal > 0 ? Math.round((delta / previousTotal) * 100) : null;

  // More spending is not "good" — it is just up. The colour says direction, the
  // words say what happened, and neither is load-bearing on its own.
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  const tone =
    delta === 0
      ? "text-muted-foreground"
      : delta > 0
        ? "text-destructive"
        : "text-success";

  let comparison: string;
  if (previousTotal === 0) {
    comparison = "Tháng trước chưa có chi tiêu nào";
  } else if (delta === 0) {
    comparison = "Bằng đúng tháng trước";
  } else {
    const direction = delta > 0 ? "Nhiều hơn" : "Ít hơn";
    const amount = formatVND(Math.abs(delta));
    comparison = `${direction} tháng trước ${amount}${pct !== null ? ` (${Math.abs(pct)}%)` : ""}`;
  }

  return (
    <Card>
      <CardContent className="space-y-1 py-2">
        <p className="text-sm text-muted-foreground">Tổng chi tháng này</p>
        <p className="text-3xl font-bold tracking-tight tabular-nums md:text-4xl">
          {formatVND(total)}
        </p>
        <p className={cn("flex items-center gap-1.5 text-sm", tone)}>
          <Icon className="size-4 shrink-0" aria-hidden />
          <span>{comparison}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {count === 0
            ? "Chưa có khoản chi nào"
            : `${count} khoản chi trong tháng`}
        </p>
      </CardContent>
    </Card>
  );
}

/** Small supporting figures. Plain numbers — again, nothing to plot. */
export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
