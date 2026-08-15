"use client";

import { CenteredMessage } from "@/components/centered-message";

/**
 * Segment error boundary — must be a Client Component. Covers everything
 * under the root layout except the layout itself (see global-error.tsx for
 * that case). Replaces `__root.tsx`'s `RootError`.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <CenteredMessage title="Đã xảy ra lỗi">
      <span className="block">Không thể tải trang này. Vui lòng thử lại.</span>
      <button type="button" onClick={reset} className="mt-2 text-sm underline">
        Thử lại
      </button>
    </CenteredMessage>
  );
}
