import { Loader2 } from "lucide-react";

/**
 * Shown while a route loader is in flight. Replaces the two identical
 * `loading.tsx` files the App Router used to pick up by convention.
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
