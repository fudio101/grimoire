import { useRef } from "react";
import {
  flexRender,
  useTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp, ChevronsUpDown, Receipt } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { transactionTableFeatures } from "@/features/transactions/table-features";
import { TransactionCardList } from "@/features/transactions/transaction-card-list";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { TransactionTableFeatures } from "@/features/transactions/table-features";
import type { TransactionTableRow } from "@/lib/types";

/**
 * Rows are absolutely positioned for virtualization, which takes them out of
 * table layout — so column widths have to be declared rather than derived from
 * content. `table`, `thead`, `tbody` and `tr` are switched to grid to keep the
 * header and body aligned; the elements stay semantic.
 */
const GRID_TEMPLATE = "150px minmax(120px, 1fr) 210px 130px 100px";

const ROW_HEIGHT = 52;

export function TransactionDataTable({
  data,
  columns,
  emptyMessage,
  onEdit,
  onDelete,
}: {
  data: TransactionTableRow[];
  columns: ColumnDef<TransactionTableFeatures, TransactionTableRow>[];
  emptyMessage: string;
  onEdit?: (row: TransactionTableRow) => void;
  onDelete?: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * One table instance drives both presentations, so sorting applies to the
   * cards too. The swap happens after hydration (getServerSnapshot is false, so
   * the server renders the card branch) — acceptable here because this sits
   * below the fold and both branches show the same rows in the same order,
   * unlike the app navigation which is switched with CSS for that reason.
   */
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Mirrors the SQL ordering the server already applies, so the first paint
  // does not reshuffle.
  const initialSorting: SortingState = [{ id: "date", desc: true }];

  const table = useTable({
    features: transactionTableFeatures,
    data,
    columns,
    initialState: { sorting: initialSorting },
  });

  const rows = table.getRowModel().rows;

  // React Compiler correctly skips memoizing here — TanStack Virtual's API is
  // why, not a bug. v8's `useReactTable` needed the same suppression; v9's
  // store-backed `useTable` no longer trips the rule, so this is the only one
  // left.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    // Same reason as the card list: the scroll element is null during SSR, and
    // the default zero rect means no rows are emitted server-side at all.
    initialRect: { width: 0, height: 700 },
  });

  if (data.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Receipt />
          </EmptyMedia>
          <EmptyTitle>Chưa có giao dịch</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!isDesktop) {
    return (
      <TransactionCardList
        rows={rows.map((r) => r.original)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div
      ref={scrollRef}
      className="relative max-h-[70vh] overflow-auto rounded-md border"
    >
      <table className="grid w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10 grid bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="grid border-b"
              style={{ gridTemplateColumns: GRID_TEMPLATE }}
            >
              {headerGroup.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const label = flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                );
                return (
                  <th
                    key={header.id}
                    /* aria-sort belongs on the header cell; the control that
                       changes it has to be a real button, or the column cannot
                       be sorted from the keyboard at all. */
                    aria-sort={
                      !sortable
                        ? undefined
                        : sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : "none"
                    }
                    className={cn(
                      "flex h-10 items-center align-middle font-medium text-muted-foreground",
                      header.column.id === "amount" && "justify-end"
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "flex h-full w-full items-center gap-1 px-2 text-left hover:text-foreground",
                          "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          header.column.id === "amount" && "justify-end"
                        )}
                      >
                        {label}
                        {sorted === "asc" ? (
                          <ChevronUp className="size-3.5" />
                        ) : sorted === "desc" ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      <span className="px-2">{label}</span>
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
                  gridTemplateColumns: GRID_TEMPLATE,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* `getVisibleCells` belongs to v9's columnVisibilityFeature,
                    which this table does not register — no column is ever
                    hidden, so the core `getAllCells` is the same list. */}
                {row.getAllCells().map((cell) => (
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
