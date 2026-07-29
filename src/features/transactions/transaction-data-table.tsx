import { useRef } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionTableRow } from "@/lib/types";

/**
 * Rows are absolutely positioned for virtualization, which takes them out of
 * table layout — so column widths have to be declared rather than derived from
 * content. `table`, `thead`, `tbody` and `tr` are switched to grid to keep the
 * header and body aligned; the elements stay semantic.
 */
// Order: date, note, category, amount [, actions]. The category column is wide
// and nowrap so a two-level path stays on one line as it did before — the
// container scrolls horizontally rather than letting rows grow taller.
const GRID_TEMPLATE = "130px minmax(80px, 1fr) 210px 120px";
// The actions column holds two icon buttons at `gap-1`. Those buttons are now
// width-responsive (44px touch below `md`, 40px from `md` up), so the column has
// to clear the wider case: 44 + 4 + 44 = 92. Row height follows for the same
// reason — 44px controls do not fit in a 45px row.
const GRID_TEMPLATE_WITH_ACTIONS = `${GRID_TEMPLATE} 100px`;
const MIN_TABLE_WIDTH = 620;

const ROW_HEIGHT = 52;

export function TransactionDataTable({
  data,
  columns,
  showActions,
  emptyMessage,
}: {
  data: TransactionTableRow[];
  columns: ColumnDef<TransactionTableRow>[];
  showActions: boolean;
  emptyMessage: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mirrors the SQL ordering the server already applies, so the first paint
  // does not reshuffle.
  const initialSorting: SortingState = [{ id: "date", desc: true }];

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility: { actions: showActions } },
    initialState: { sorting: initialSorting },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const template = showActions ? GRID_TEMPLATE_WITH_ACTIONS : GRID_TEMPLATE;

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="relative max-h-[70vh] overflow-auto rounded-md border"
    >
      <table
        className="grid w-full caption-bottom text-sm"
        style={{ minWidth: MIN_TABLE_WIDTH }}
      >
        <thead className="sticky top-0 z-10 grid bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="grid border-b"
              style={{ gridTemplateColumns: template }}
            >
              {headerGroup.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={cn(
                      "flex h-10 items-center gap-1 px-2 text-left align-middle font-medium text-muted-foreground",
                      header.column.id === "amount" && "justify-end",
                      sortable && "cursor-pointer select-none"
                    )}
                    onClick={
                      sortable
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {sorted === "asc" && <ChevronUp className="h-3.5 w-3.5" />}
                    {sorted === "desc" && (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody
          className="relative grid"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr
                key={row.id}
                data-index={virtualRow.index}
                ref={(el) => virtualizer.measureElement(el)}
                className="absolute grid w-full border-b hover:bg-muted/50"
                style={{
                  gridTemplateColumns: template,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="flex min-w-0 items-center px-2 py-2 align-middle"
                  >
                    <span className="min-w-0 flex-1">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
