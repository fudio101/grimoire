import { Loader2 } from "lucide-react";

/**
 * Shown while a route loader is in flight. Rendered by each of the App
 * Router's `loading.tsx` files (`dashboard/`, `dashboard/transactions/`,
 * `dashboard/manage/purposes/`, `dashboard/manage/links/`) so the fallback
 * markup lives in exactly one place.
 */
export function PendingIndicator() {
  return (
    <div className="flex w-full items-center justify-center py-24">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}
