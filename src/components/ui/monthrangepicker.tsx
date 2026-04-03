"use client";
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "./button";
import { cn } from "@/lib/utils";

const addMonths = (input: Date, months: number) => {
  const date = new Date(input);
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  date.setDate(
    Math.min(
      input.getDate(),
      getDaysInMonth(date.getFullYear(), date.getMonth() + 1)
    )
  );
  return date;
};
const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

type Month = {
  number: number;
  name: string;
  yearOffset: number;
};

const MONTHS_DOUBLE: Month[][] = [
  [
    { number: 0, name: "Jan", yearOffset: 0 },
    { number: 1, name: "Feb", yearOffset: 0 },
    { number: 2, name: "Mar", yearOffset: 0 },
    { number: 3, name: "Apr", yearOffset: 0 },
    { number: 0, name: "Jan", yearOffset: 1 },
    { number: 1, name: "Feb", yearOffset: 1 },
    { number: 2, name: "Mar", yearOffset: 1 },
    { number: 3, name: "Apr", yearOffset: 1 },
  ],
  [
    { number: 4, name: "May", yearOffset: 0 },
    { number: 5, name: "Jun", yearOffset: 0 },
    { number: 6, name: "Jul", yearOffset: 0 },
    { number: 7, name: "Aug", yearOffset: 0 },
    { number: 4, name: "May", yearOffset: 1 },
    { number: 5, name: "Jun", yearOffset: 1 },
    { number: 6, name: "Jul", yearOffset: 1 },
    { number: 7, name: "Aug", yearOffset: 1 },
  ],
  [
    { number: 8, name: "Sep", yearOffset: 0 },
    { number: 9, name: "Oct", yearOffset: 0 },
    { number: 10, name: "Nov", yearOffset: 0 },
    { number: 11, name: "Dec", yearOffset: 0 },
    { number: 8, name: "Sep", yearOffset: 1 },
    { number: 9, name: "Oct", yearOffset: 1 },
    { number: 10, name: "Nov", yearOffset: 1 },
    { number: 11, name: "Dec", yearOffset: 1 },
  ],
];

const MONTHS_SINGLE: Month[][] = [
  [
    { number: 0, name: "Jan", yearOffset: 0 },
    { number: 1, name: "Feb", yearOffset: 0 },
    { number: 2, name: "Mar", yearOffset: 0 },
    { number: 3, name: "Apr", yearOffset: 0 },
  ],
  [
    { number: 4, name: "May", yearOffset: 0 },
    { number: 5, name: "Jun", yearOffset: 0 },
    { number: 6, name: "Jul", yearOffset: 0 },
    { number: 7, name: "Aug", yearOffset: 0 },
  ],
  [
    { number: 8, name: "Sep", yearOffset: 0 },
    { number: 9, name: "Oct", yearOffset: 0 },
    { number: 10, name: "Nov", yearOffset: 0 },
    { number: 11, name: "Dec", yearOffset: 0 },
  ],
];

type QuickSelector = {
  label: string;
  startMonth: Date;
  endMonth: Date;
  variant?: ButtonVariant;
  onClick?: (selector: QuickSelector) => void;
};

const QUICK_SELECTORS: QuickSelector[] = [
  {
    label: "This year",
    startMonth: new Date(new Date().getFullYear(), 0),
    endMonth: new Date(new Date().getFullYear(), 11),
  },
  {
    label: "Last year",
    startMonth: new Date(new Date().getFullYear() - 1, 0),
    endMonth: new Date(new Date().getFullYear() - 1, 11),
  },
  {
    label: "Last 6 months",
    startMonth: new Date(addMonths(new Date(), -6)),
    endMonth: new Date(),
  },
  {
    label: "Last 12 months",
    startMonth: new Date(addMonths(new Date(), -12)),
    endMonth: new Date(),
  },
];

type MonthRangeCalProps = {
  selectedMonthRange?: { start: Date; end: Date };
  onStartMonthSelect?: (date: Date) => void;
  onMonthRangeSelect?: ({ start, end }: { start: Date; end: Date }) => void;
  onYearForward?: () => void;
  onYearBackward?: () => void;
  callbacks?: {
    yearLabel?: (year: number) => string;
    monthLabel?: (month: Month) => string;
  };
  variant?: {
    calendar?: {
      main?: ButtonVariant;
      selected?: ButtonVariant;
    };
    chevrons?: ButtonVariant;
  };
  minDate?: Date;
  maxDate?: Date;
  quickSelectors?: QuickSelector[];
  showQuickSelectors?: boolean;
};

type ButtonVariant =
  | "default"
  | "outline"
  | "ghost"
  | "link"
  | "destructive"
  | "secondary"
  | null
  | undefined;

function MonthRangePicker({
  onMonthRangeSelect,
  onStartMonthSelect,
  callbacks,
  selectedMonthRange,
  onYearBackward,
  onYearForward,
  variant,
  minDate,
  maxDate,
  quickSelectors,
  showQuickSelectors,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & MonthRangeCalProps) {
  return (
    <div
      className={cn("mx-auto w-72 p-3 sm:w-auto sm:min-w-[400px]", className)}
      {...props}
    >
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
        <div className="w-full">
          <MonthRangeCal
            onMonthRangeSelect={onMonthRangeSelect}
            onStartMonthSelect={onStartMonthSelect}
            callbacks={callbacks}
            selectedMonthRange={selectedMonthRange}
            onYearBackward={onYearBackward}
            onYearForward={onYearForward}
            variant={variant}
            minDate={minDate}
            maxDate={maxDate}
            quickSelectors={quickSelectors}
            showQuickSelectors={showQuickSelectors}
          ></MonthRangeCal>
        </div>
      </div>
    </div>
  );
}

function MonthRangeCal({
  selectedMonthRange,
  onMonthRangeSelect,
  onStartMonthSelect,
  callbacks,
  variant,
  minDate,
  maxDate,
  quickSelectors = QUICK_SELECTORS,
  showQuickSelectors = true,
  onYearBackward,
  onYearForward,
}: MonthRangeCalProps) {
  const [startYear, setStartYear] = React.useState<number>(
    selectedMonthRange?.start.getFullYear() ?? new Date().getFullYear()
  );
  const [startMonth, setStartMonth] = React.useState<number>(
    selectedMonthRange?.start?.getMonth() ?? new Date().getMonth()
  );
  const [endYear, setEndYear] = React.useState<number>(
    selectedMonthRange?.end?.getFullYear() ?? new Date().getFullYear() + 1
  );
  const [endMonth, setEndMonth] = React.useState<number>(
    selectedMonthRange?.end?.getMonth() ?? new Date().getMonth()
  );
  const [rangePending, setRangePending] = React.useState<boolean>(false);
  const [endLocked, setEndLocked] = React.useState<boolean>(true);
  const [menuYear, setMenuYear] = React.useState<number>(startYear);
  const [isSelected, setIsSelected] =
    React.useState<boolean>(!!selectedMonthRange);

  if (minDate && maxDate && minDate > maxDate) minDate = maxDate;

  const renderMonthTable = (monthsGrid: Month[][]) => (
    <table
      className={cn(
        "w-full border-collapse space-y-1",
        monthsGrid === MONTHS_SINGLE ? "table-fixed" : ""
      )}
    >
      <tbody>
        {monthsGrid.map((monthRow, a) => {
          return (
            <tr key={"row-" + a} className="mt-2 flex w-full">
              {monthRow.map((m, i) => {
                return (
                  <td
                    key={m.number + "-" + m.yearOffset}
                    className={cn(
                      cn(
                        cn(
                          cn(
                            "[&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent relative h-10 p-0 text-center text-sm focus-within:relative focus-within:z-20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected].day-range-end)]:rounded-r-md",
                            monthsGrid === MONTHS_DOUBLE ? "w-1/4" : "w-1/4",
                            (menuYear + m.yearOffset > startYear ||
                              (menuYear + m.yearOffset == startYear &&
                                m.number > startMonth)) &&
                              (menuYear + m.yearOffset < endYear ||
                                (menuYear + m.yearOffset == endYear &&
                                  m.number < endMonth)) &&
                              (rangePending || endLocked) &&
                              isSelected
                              ? "text-accent-foreground bg-accent"
                              : ""
                          ),
                          menuYear + m.yearOffset == startYear &&
                            m.number == startMonth &&
                            (rangePending || endLocked) &&
                            isSelected
                            ? "text-accent-foreground bg-accent rounded-l-md"
                            : ""
                        ),
                        menuYear + m.yearOffset == endYear &&
                          m.number == endMonth &&
                          (rangePending || endLocked) &&
                          isSelected &&
                          menuYear + m.yearOffset >= startYear &&
                          m.number >= startMonth
                          ? "text-accent-foreground bg-accent rounded-r-md"
                          : ""
                      ),
                      monthsGrid === MONTHS_DOUBLE && i == 3 ? "mr-2" : "",
                      monthsGrid === MONTHS_DOUBLE && i == 4 ? "ml-2" : ""
                    )}
                    onMouseEnter={() => {
                      if (rangePending && !endLocked) {
                        setEndYear(menuYear + m.yearOffset);
                        setEndMonth(m.number);
                      }
                    }}
                  >
                    <button
                      onClick={() => {
                        if (rangePending) {
                          if (
                            menuYear + m.yearOffset < startYear ||
                            (menuYear + m.yearOffset == startYear &&
                              m.number < startMonth)
                          ) {
                            setRangePending(true);
                            setEndLocked(false);
                            setIsSelected(true);
                            setStartMonth(m.number);
                            setStartYear(menuYear + m.yearOffset);
                            setEndYear(menuYear + m.yearOffset);
                            setEndMonth(m.number);
                            if (onStartMonthSelect)
                              onStartMonthSelect(
                                new Date(menuYear + m.yearOffset, m.number)
                              );
                          } else {
                            setRangePending(false);
                            setEndLocked(true);
                            setIsSelected(true);
                            // Event fire data selected

                            if (onMonthRangeSelect)
                              onMonthRangeSelect({
                                start: new Date(startYear, startMonth),
                                end: new Date(
                                  menuYear + m.yearOffset,
                                  m.number
                                ),
                              });
                          }
                        } else {
                          setRangePending(true);
                          setEndLocked(false);
                          setIsSelected(true);
                          setStartMonth(m.number);
                          setStartYear(menuYear + m.yearOffset);
                          setEndYear(menuYear + m.yearOffset);
                          setEndMonth(m.number);
                          if (onStartMonthSelect)
                            onStartMonthSelect(
                              new Date(menuYear + m.yearOffset, m.number)
                            );
                        }
                      }}
                      disabled={
                        (maxDate
                          ? menuYear + m.yearOffset > maxDate?.getFullYear() ||
                            (menuYear + m.yearOffset ==
                              maxDate?.getFullYear() &&
                              m.number > maxDate.getMonth())
                          : false) ||
                        (minDate
                          ? menuYear + m.yearOffset < minDate?.getFullYear() ||
                            (menuYear + m.yearOffset ==
                              minDate?.getFullYear() &&
                              m.number < minDate.getMonth())
                          : false)
                      }
                      className={cn(
                        buttonVariants({
                          variant:
                            ((startMonth == m.number &&
                              menuYear + m.yearOffset == startYear) ||
                              (endMonth == m.number &&
                                menuYear + m.yearOffset == endYear &&
                                !rangePending)) &&
                            isSelected
                              ? (variant?.calendar?.selected ?? "default")
                              : (variant?.calendar?.main ?? "ghost"),
                        }),
                        "h-full w-full p-0 font-normal aria-selected:opacity-100",
                        menuYear + m.yearOffset === new Date().getFullYear() &&
                          m.number === new Date().getMonth() &&
                          !(
                            ((startMonth == m.number &&
                              menuYear + m.yearOffset == startYear) ||
                              (endMonth == m.number &&
                                menuYear + m.yearOffset == endYear &&
                                !rangePending)) &&
                            isSelected
                          )
                          ? "ring-primary/50 text-primary font-semibold ring-1"
                          : ""
                      )}
                    >
                      {callbacks?.monthLabel ? callbacks.monthLabel(m) : m.name}
                    </button>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="w-full space-y-4 sm:min-w-[400px]">
        {/* Header (Desktop - 2 years) */}
        <div className="relative hidden items-center justify-evenly pt-1 sm:flex">
          <div className="text-sm font-medium">
            {callbacks?.yearLabel ? callbacks?.yearLabel(menuYear) : menuYear}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setMenuYear(menuYear - 1);
                if (onYearBackward) onYearBackward();
              }}
              className={cn(
                buttonVariants({ variant: variant?.chevrons ?? "outline" }),
                "absolute left-1 inline-flex h-7 w-7 items-center justify-center p-0"
              )}
            >
              <ChevronLeft className="h-4 w-4 opacity-50" />
            </button>
            <button
              onClick={() => {
                setMenuYear(menuYear + 1);
                if (onYearForward) onYearForward();
              }}
              className={cn(
                buttonVariants({ variant: variant?.chevrons ?? "outline" }),
                "absolute right-1 inline-flex h-7 w-7 items-center justify-center p-0"
              )}
            >
              <ChevronRight className="h-4 w-4 opacity-50" />
            </button>
          </div>
          <div className="text-sm font-medium">
            {callbacks?.yearLabel
              ? callbacks?.yearLabel(menuYear + 1)
              : menuYear + 1}
          </div>
        </div>

        {/* Header (Mobile - 1 year) */}
        <div className="relative flex items-center justify-center pt-1 sm:hidden">
          <button
            onClick={() => {
              setMenuYear(menuYear - 1);
              if (onYearBackward) onYearBackward();
            }}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? "outline" }),
              "absolute left-1 inline-flex h-7 w-7 items-center justify-center p-0"
            )}
          >
            <ChevronLeft className="h-4 w-4 opacity-50" />
          </button>
          <div className="text-sm font-medium">
            {callbacks?.yearLabel ? callbacks?.yearLabel(menuYear) : menuYear}
          </div>
          <button
            onClick={() => {
              setMenuYear(menuYear + 1);
              if (onYearForward) onYearForward();
            }}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? "outline" }),
              "absolute right-1 inline-flex h-7 w-7 items-center justify-center p-0"
            )}
          >
            <ChevronRight className="h-4 w-4 opacity-50" />
          </button>
        </div>

        {/* Month Tables */}
        <div className="hidden sm:block">{renderMonthTable(MONTHS_DOUBLE)}</div>
        <div className="block sm:hidden">{renderMonthTable(MONTHS_SINGLE)}</div>
      </div>

      {showQuickSelectors ? (
        <div className="mt-4 flex flex-wrap sm:mt-0 sm:flex-col sm:gap-1">
          {quickSelectors.map((s) => {
            return (
              <div key={s.label} className="w-1/2 p-1 sm:w-full sm:p-0">
                <Button
                  className="w-full"
                  onClick={() => {
                    setStartYear(s.startMonth.getFullYear());
                    setStartMonth(s.startMonth.getMonth());
                    setEndYear(s.endMonth.getFullYear());
                    setEndMonth(s.endMonth.getMonth());
                    setRangePending(false);
                    setEndLocked(true);
                    setIsSelected(true);
                    if (onMonthRangeSelect)
                      onMonthRangeSelect({
                        start: s.startMonth,
                        end: s.endMonth,
                      });
                    if (s.onClick) s.onClick(s);
                  }}
                  variant={s.variant ?? "outline"}
                >
                  {s.label}
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

MonthRangePicker.displayName = "MonthRangePicker";

export { MonthRangePicker };
