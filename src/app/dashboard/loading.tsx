import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex w-full items-center justify-center py-24">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}
