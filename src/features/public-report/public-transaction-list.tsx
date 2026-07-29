import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { formatRelativeDay, formatTime, formatVND } from "@/lib/format";
import type { TransactionTableRow } from "@/lib/types";

/**
 * The shared report's list of individual entries.
 *
 * Not the dashboard's table, and not virtualized. A shared link covers a
 * month's worth of one household's spending — tens of rows, not thousands — so
 * virtualization would buy nothing and cost the ability to use the browser's
 * own find-on-page, which is a real tool for someone scanning for one amount.
 *
 * The table it replaces declared its columns in pixels (a 620px minimum) and
 * was nested inside a max-w-2xl card, so it scrolled sideways on a phone *and*
 * on a desktop.
 */
export function PublicTransactionList({
  transactions,
}: {
  transactions: TransactionTableRow[];
}) {
  if (transactions.length === 0) {
    return (
      <Empty>
        <EmptyTitle>Chưa có khoản chi nào</EmptyTitle>
        <EmptyDescription>
          Không có khoản chi nào trong khoảng thời gian này.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <ul className="space-y-2">
      {transactions.map((tx) => (
        <li key={tx.id}>
          <Item variant="outline" className="items-start">
            <ItemContent>
              <ItemTitle className="text-base leading-snug">
                {tx.note || "Không có ghi chú"}
              </ItemTitle>
              <ItemDescription className="text-[0.9375rem]">
                {tx.categoryPathParts.join(" › ") || "—"}
              </ItemDescription>
              <ItemDescription className="text-[0.9375rem]">
                {formatRelativeDay(tx.date)} · {formatTime(tx.date)}
              </ItemDescription>
            </ItemContent>
            {/* The amount is what people came to read, so it gets the weight. */}
            <span className="shrink-0 text-lg font-semibold tabular-nums">
              {formatVND(tx.amount)}
            </span>
          </Item>
        </li>
      ))}
    </ul>
  );
}
