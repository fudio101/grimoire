export function getDefaultMonthRange() {
  const now = new Date();
  const toMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const fromMonth = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
  return { fromMonth, toMonth };
}

export function formatVND(amount: number): string {
  return Number(amount).toLocaleString("en-US") + " ₫";
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
