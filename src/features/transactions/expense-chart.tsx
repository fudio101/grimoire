"use client";

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
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  type Granularity,
  formatCompactVND,
  groupTransactionsByGranularity,
} from "@/lib/chart-utils";
import { formatVND } from "@/lib/format";

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
}

export function ExpenseChart({ transactions }: ExpenseChartProps) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const chartData = useMemo(
    () => groupTransactionsByGranularity(transactions, granularity),
    [transactions, granularity]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tổng chi theo thời gian</CardTitle>
        <CardAction>
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
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
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
    </Card>
  );
}
