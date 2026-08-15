"use client";

import { CenteredMessage } from "@/components/centered-message";

/**
 * Only triggers if the root layout itself throws (e.g. the `cookies()` read
 * in layout.tsx). Next requires it to render its own <html>/<body>, since it
 * replaces the layout that would normally provide them. No Providers, no
 * Tailwind theme class — the layout that would have supplied both is exactly
 * what failed, so this stays deliberately minimal.
 */
export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <CenteredMessage title="Đã xảy ra lỗi">
          <span className="block">
            Không thể tải trang này. Vui lòng thử lại.
          </span>
          <button
            type="button"
            onClick={reset}
            className="mt-2 text-sm underline"
          >
            Thử lại
          </button>
        </CenteredMessage>
      </body>
    </html>
  );
}
