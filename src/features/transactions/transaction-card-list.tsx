import { useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatRelativeDay, formatTime, formatVND } from "@/lib/format";
import type { TransactionTableRow } from "@/lib/types";

const ESTIMATED_CARD_HEIGHT = 84;

/**
 * The mobile presentation of the transaction list.
 *
 * The table cannot be made to fit: its columns are declared in pixels because
 * virtualized rows are absolutely positioned and therefore outside table layout,
 * which forced a 620px minimum against roughly 358px of usable width. Rather
 * than shrink type or scroll sideways, each row becomes a card that flows to
 * whatever width there is.
 *
 * Virtualized against the window rather than a scroll container: on a phone the
 * page itself scrolls, and a nested `max-h-[70vh]` scroller inside a scrolling
 * page is the thing that makes lists feel stuck.
 */
export function TransactionCardList({
  rows,
  onEdit,
  onDelete,
}: {
  rows: TransactionTableRow[];
  onEdit?: (row: TransactionTableRow) => void;
  onDelete?: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const showActions = Boolean(onEdit && onDelete);

  /**
   * The list's distance from the top of the document, which the window
   * virtualizer needs to place items.
   *
   * Measured in an effect rather than read from the ref during render: on the
   * first render the ref is still null, so reading it there would pin
   * scrollMargin at 0 forever and every card would be offset by the height of
   * everything above the list. Re-measured when the row count changes, since
   * that is when the blocks above it can reflow.
   */
  const [scrollMargin, setScrollMargin] = useState(0);
  useEffect(() => {
    setScrollMargin(listRef.current?.offsetTop ?? 0);
  }, [rows.length]);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: 8,
    scrollMargin,
    /**
     * There is no window to measure during SSR, and the default zero-height rect
     * makes the visible range empty — so the server would render the list
     * wrapper with no rows in it, and the first screenful would only appear
     * after hydration. That defeats the loader's whole purpose.
     *
     * Seeding a viewport height emits roughly one screen of cards server-side;
     * the real measurement replaces it as soon as the client takes over.
     */
    initialRect: { width: 0, height: 900 },
  });

  return (
    <div ref={listRef} className="relative">
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={row.id}
              data-index={virtualRow.index}
              ref={(el) => virtualizer.measureElement(el)}
              className="absolute top-0 left-0 w-full pb-2"
              style={{
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle className="truncate">
                    {row.note || "Không có ghi chú"}
                  </ItemTitle>
                  <ItemDescription className="truncate">
                    {row.categoryPathParts.join(" › ") || "—"}
                  </ItemDescription>
                  <ItemDescription>
                    {formatRelativeDay(row.date)} · {formatTime(row.date)}
                  </ItemDescription>
                </ItemContent>
                <ItemActions className="flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">
                    {formatVND(row.amount)}
                  </span>
                  {showActions && (
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Sửa ${row.note || "giao dịch"}`}
                        onClick={() => onEdit?.(row)}
                      >
                        <Pencil />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Xoá ${row.note || "giao dịch"}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        }
                        title="Xoá giao dịch"
                        description={`Xoá khoản ${formatVND(row.amount)}${row.note ? ` — ${row.note}` : ""}? Không thể hoàn tác.`}
                        onConfirm={() => onDelete?.(row.id)}
                      />
                    </div>
                  )}
                </ItemActions>
              </Item>
            </div>
          );
        })}
      </div>
    </div>
  );
}
