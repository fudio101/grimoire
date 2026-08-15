"use client";

import { Button } from "@/components/ui/button";
import { PublicShell } from "./public-shell";

/**
 * Segment-scoped, `/p`-specific copy — same reasoning as `not-found.tsx`.
 * Reloads the whole page rather than calling `reset()`: a data-fetch failure
 * here almost always means the request itself needs retrying, not just the
 * error boundary re-rendering with the same stale props.
 */
export default function PublicError() {
  return (
    <PublicShell>
      <div className="space-y-3 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Chưa tải được báo cáo
        </h1>
        <p className="text-muted-foreground">
          Có lỗi xảy ra khi tải dữ liệu. Bạn thử tải lại trang giúp nhé.
        </p>
        <Button size="lg" onClick={() => window.location.reload()}>
          Tải lại trang
        </Button>
      </div>
    </PublicShell>
  );
}
