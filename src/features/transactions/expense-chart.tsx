import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  type Granularity,
  groupTransactionsByGranularity,
} from "@/lib/chart-utils";
import { formatCompactVND, formatVND } from "@/lib/format";

const chartConfig = {
  total: {
    label: "Tổng chi",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
];

interface ExpenseChartProps {
  transactions: Array<{ amount: number; date: string }>;
  /**
   * Start collapsed, with the card's own header acting as the toggle.
   *
   * The shared report used to wrap this in a separate collapsible box, which
   * produced two frames and two titles — a "Xem biểu đồ" button and then this
   * card underneath it, visibly not inside it. Worse, Recharts' responsive
   * container measured its parent while that box was still animating from zero
   * height and computed a width wider than the screen, so opening the chart
   * pushed the whole page sideways. Mounting the body only once it is actually
   * visible fixes both.
   */
  collapsible?: boolean;
}

export function ExpenseChart({
  transactions,
  collapsible = false,
}: ExpenseChartProps) {
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [open, setOpen] = useState(!collapsible);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const expanded = !collapsible || open;

  const chartData = useMemo(
    () => groupTransactionsByGranularity(transactions, granularity),
    [transactions, granularity]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={expanded}
              className="-my-1 flex w-full items-center gap-2 rounded-md py-1 text-left"
            >
              <span className="flex-1">Tổng chi theo thời gian</span>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </button>
          ) : (
            "Tổng chi theo thời gian"
          )}
        </CardTitle>
        <CardAction hidden={!expanded}>
          <Select
            value={granularity}
            onValueChange={(v) => setGranularity(v as Granularity)}
          >
            <SelectTrigger size="sm" className="w-[100px]">
              <SelectValue>
                {(value) =>
                  GRANULARITY_OPTIONS.find((o) => o.value === value)?.label ??
                  "Ngày"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              {GRANULARITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      {expanded && (
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              Không có dữ liệu để hiển thị biểu đồ.
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="h-[220px] w-full sm:h-[280px]"
            >
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                />
                {isDesktop && (
                  <YAxis
                    tickFormatter={formatCompactVND}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fontSize: 12 }}
                  />
                )}
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [
                        formatVND(Number(value)),
                        "Tổng chi",
                      ]}
                    />
                  }
                />
                <Bar
                  dataKey="total"
                  fill="var(--color-total)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      )}
    </Card>
  );
}
