import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MonthRangePicker } from "@/components/ui/monthrangepicker";

interface MonthRangeFilterProps {
  fromMonth: string | null; // Format "YYYY-MM" or null (all time)
  toMonth: string | null; // Format "YYYY-MM" or null (all time)
  onChange: (fromMonth: string | null, toMonth: string | null) => void;
  className?: string;
}

function parseMonth(monthStr: string | null) {
  if (!monthStr) return undefined;
  const [year, month] = monthStr.split("-");
  return new Date(parseInt(year), parseInt(month) - 1);
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDisplay(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function MonthRangeFilter({
  fromMonth,
  toMonth,
  onChange,
  className,
}: MonthRangeFilterProps) {
  const [open, setOpen] = React.useState(false);

  const start = parseMonth(fromMonth);
  const end = parseMonth(toMonth);

  const dateRange = start && end ? { start, end } : undefined;

  const handleSelect = (range: { start: Date; end: Date }) => {
    onChange(formatMonth(range.start), formatMonth(range.end));
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null); // null means "all time"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-[240px] justify-start text-left font-normal",
            !dateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange ? (
            `${formatDisplay(dateRange.start)} - ${formatDisplay(
              dateRange.end
            )}`
          ) : (
            <span>Tất cả thời gian</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <MonthRangePicker
            key={dateRange ? `${fromMonth}-${toMonth}` : "empty"}
            selectedMonthRange={dateRange}
            onMonthRangeSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
      {/* We always show the clear button if there is a selected date range */}
      {dateRange && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          title="Xoá bộ lọc (hiện tất cả)"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
