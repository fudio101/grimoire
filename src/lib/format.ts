const VND_GROUPING = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

/** The current month as `YYYY-MM`, the key every month-scoped view is built on. */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Shift a `YYYY-MM` key by whole months. Negative goes backwards. */
export function addMonths(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(year, mon - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Vietnamese grouping: 1.234.567 ₫, not the 1,234,567 ₫ this shipped with.
 * `toLocaleString("en-US")` was a migration leftover and read as foreign in an
 * otherwise entirely Vietnamese UI.
 *
 * Negative amounts render as −1.234 ₫ with a real minus sign rather than a
 * hyphen, so they line up with digits instead of sitting half a pixel high.
 */
export function formatVND(amount: number): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "0 ₫";
  const sign = value < 0 ? "−" : "";
  return `${sign}${VND_GROUPING.format(Math.abs(value))} ₫`;
}

/** Axis and chip label: 1,5M / 250K. Keeps the Vietnamese decimal comma. */
export function formatCompactVND(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    const text = val % 1 === 0 ? String(val) : val.toFixed(1).replace(".", ",");
    return `${sign}${text}M`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    const text = val % 1 === 0 ? String(val) : val.toFixed(1).replace(".", ",");
    return `${sign}${text}K`;
  }
  return `${sign}${abs}`;
}

export function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/** `2026-07` -> `Tháng 7 / 2026`, the heading for every month-scoped view. */
export function formatMonthLabel(month: string): string {
  const [year, mon] = month.split("-");
  if (!year || !mon) return month;
  return `Tháng ${Number(mon)} / ${year}`;
}

/**
 * `Hôm nay` / `Hôm qua` / `15/07`, for transaction rows where the year is
 * almost always the current one and repeating it is noise. Compares calendar
 * days rather than elapsed hours, so 23:30 yesterday reads as "Hôm qua".
 */
export function formatRelativeDay(isoString: string, now = new Date()): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;

  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDelta = Math.round(
    (startOfDay(now) - startOfDay(d)) / (24 * 60 * 60 * 1000)
  );

  if (dayDelta === 0) return "Hôm nay";
  if (dayDelta === 1) return "Hôm qua";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return d.getFullYear() === now.getFullYear()
    ? `${dd}/${mm}`
    : `${dd}/${mm}/${d.getFullYear()}`;
}

/** `08:30`, paired with formatRelativeDay in list rows. */
export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
