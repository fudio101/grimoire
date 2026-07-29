import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { formatVND } from "@/lib/format";

/**
 * Ranked magnitude, so: horizontal bars, sorted, one colour.
 *
 * Every bar is the same hue on purpose. Colour here would encode rank, and rank
 * is already encoded by order and by length — worse, a per-rank palette means
 * the same category changes colour as spending shifts month to month, which is
 * exactly the "colour follows rank, not entity" mistake. Length carries the
 * magnitude; the name and the amount are text beside it.
 */
export function CategoryBreakdown({
  items,
  total,
}: {
  items: { id: string; name: string; total: number }[];
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi nhiều nhất cho gì</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <Empty>
            <EmptyTitle>Chưa có dữ liệu</EmptyTitle>
            <EmptyDescription>
              Thêm giao dịch để xem tháng này tiêu vào những nhóm nào.
            </EmptyDescription>
          </Empty>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const pct = total > 0 ? (item.total / total) * 100 : 0;
              return (
                <li key={item.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">
                      {item.name}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatVND(item.total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${item.name}: ${Math.round(pct)} phần trăm tổng chi`}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--chart-1)]"
                        style={{ width: `${Math.max(pct, 1.5)}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
