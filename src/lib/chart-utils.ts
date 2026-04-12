export type Granularity = "day" | "week" | "month" | "year";

export type ChartDataPoint = {
  label: string;
  sortKey: string;
  total: number;
};

function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getISOWeekYear(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

export function getGroupKey(dateStr: string, granularity: Granularity): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  switch (granularity) {
    case "day":
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    case "week": {
      const week = getISOWeekNumber(d);
      const year = getISOWeekYear(d);
      return `${year}-W${String(week).padStart(2, "0")}`;
    }
    case "month":
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    case "year":
      return `${d.getFullYear()}`;
  }
}

export function getGroupLabel(
  sortKey: string,
  granularity: Granularity
): string {
  switch (granularity) {
    case "day": {
      // sortKey: "YYYY-MM-DD"
      const parts = sortKey.split("-");
      return `${parts[2]}/${parts[1]}`;
    }
    case "week": {
      // sortKey: "YYYY-WNN"
      const week = sortKey.split("-W")[1];
      return `T${parseInt(week)}`;
    }
    case "month": {
      // sortKey: "YYYY-MM"
      const parts = sortKey.split("-");
      return `Th.${parts[1]}/${parts[0].slice(2)}`;
    }
    case "year":
      return sortKey;
  }
}

export function formatCompactVND(amount: number): string {
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `${val % 1 === 0 ? val : val.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const val = amount / 1_000;
    return `${val % 1 === 0 ? val : val.toFixed(1)}K`;
  }
  return `${amount}`;
}

function getDateRange(
  transactions: Array<{ date: string }>
): [Date, Date] | null {
  let min: Date | null = null;
  let max: Date | null = null;
  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  if (!min || !max) return null;
  return [min, max];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function generateAllKeys(
  min: Date,
  max: Date,
  granularity: Granularity
): string[] {
  const keys: string[] = [];
  const d = new Date(min);

  switch (granularity) {
    case "day":
      d.setHours(0, 0, 0, 0);
      while (d <= max) {
        keys.push(
          `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
        );
        d.setDate(d.getDate() + 1);
      }
      break;
    case "week": {
      // Align to Monday of the first week
      const day = d.getDay();
      d.setDate(d.getDate() - ((day + 6) % 7));
      d.setHours(0, 0, 0, 0);
      while (d <= max) {
        const week = getISOWeekNumber(d);
        const year = getISOWeekYear(d);
        keys.push(`${year}-W${pad2(week)}`);
        d.setDate(d.getDate() + 7);
      }
      break;
    }
    case "month": {
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      const maxMonth = new Date(max);
      maxMonth.setDate(1);
      while (d <= maxMonth) {
        keys.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
        d.setMonth(d.getMonth() + 1);
      }
      break;
    }
    case "year": {
      const startYear = min.getFullYear();
      const endYear = max.getFullYear();
      for (let y = startYear; y <= endYear; y++) {
        keys.push(`${y}`);
      }
      break;
    }
  }
  return keys;
}

export function groupTransactionsByGranularity(
  transactions: Array<{ amount: number; date: string }>,
  granularity: Granularity
): ChartDataPoint[] {
  const range = getDateRange(transactions);
  if (!range) return [];

  const map = new Map<string, number>();

  for (const tx of transactions) {
    const key = getGroupKey(tx.date, granularity);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + tx.amount);
  }

  const allKeys = generateAllKeys(range[0], range[1], granularity);

  return allKeys.map((sortKey) => ({
    label: getGroupLabel(sortKey, granularity),
    sortKey,
    total: map.get(sortKey) ?? 0,
  }));
}
