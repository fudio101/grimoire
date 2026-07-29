import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The headline figure, and the reason most people open this link.
 *
 * It replaces a small grey Badge that sat on the same row as the link name with
 * no mobile fallback, so a long name and the total fought over one line. The
 * comparison spells out the direction in words as well as colour and an arrow —
 * relying on red-versus-green alone fails for a colour-blind reader, and on a
 * page written for people who did not choose to be here it is worth being
 * explicit.
 */
export function PublicTotalCard({
  total,
  previousTotal,
  count,
}: {
  total: number;
  previousTotal: number | null;
  count: number;
}) {
  const delta = previousTotal === null ? null : total - previousTotal;
  const pct =
    previousTotal && previousTotal > 0 && delta !== null
      ? Math.round((delta / previousTotal) * 100)
      : null;

  const Icon =
    delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  const tone =
    delta === null || delta === 0
      ? "text-muted-foreground"
      : delta > 0
        ? "text-destructive"
        : "text-success";

  let comparison: string | null = null;
  if (delta !== null) {
    if (previousTotal === 0) {
      comparison = "Tháng trước không có khoản chi nào";
    } else if (delta === 0) {
      comparison = "Bằng đúng tháng trước";
    } else {
      const direction = delta > 0 ? "Nhiều hơn" : "Ít hơn";
      comparison = `${direction} tháng trước ${formatVND(Math.abs(delta))}${
        pct !== null ? ` (${Math.abs(pct)}%)` : ""
      }`;
    }
  }

  return (
    <Card>
      <CardContent className="space-y-2 py-4 text-center">
        <p className="text-muted-foreground">Tổng chi</p>
        <p className="text-4xl font-bold tracking-tight tabular-nums">
          {formatVND(total)}
        </p>
        {comparison && (
          <p className={cn("flex items-center justify-center gap-1.5", tone)}>
            <Icon className="size-5 shrink-0" aria-hidden />
            <span>{comparison}</span>
          </p>
        )}
        <p className="text-muted-foreground">
          {count === 0 ? "Không có khoản chi nào" : `${count} khoản chi`}
        </p>
      </CardContent>
    </Card>
  );
}
