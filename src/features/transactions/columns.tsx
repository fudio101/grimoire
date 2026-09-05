import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDateTime, formatVND } from "@/lib/format";
import type { TransactionTableFeatures } from "@/features/transactions/table-features";
import type { TransactionTableRow } from "@/lib/types";

/** Root → leaf, with the ancestors muted. Same rendering both routes used. */
function CategoryPath({ row }: { row: TransactionTableRow }) {
  const path = row.categoryPathParts;
  if (path.length === 0) return <>{row.categoryName ?? "—"}</>;

  const leaf = path[path.length - 1];
  const parents = path.slice(0, -1);
  return (
    <>
      {parents.length > 0 && (
        <span className="text-muted-foreground">{parents.join(" › ")} › </span>
      )}
      {leaf}
    </>
  );
}

type ActionHandlers = {
  onEdit: (row: TransactionTableRow) => void;
  onDelete: (id: string) => void;
};

/**
 * The dashboard table's columns. The public report used to share this
 * definition and hide the `actions` column; it now renders its own card list,
 * so this serves one screen and the column order is free again.
 */
export function transactionColumns(
  handlers?: ActionHandlers
): ColumnDef<TransactionTableFeatures, TransactionTableRow>[] {
  return [
    {
      id: "date",
      accessorKey: "date",
      header: "Thời gian",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {formatDateTime(row.original.date)}
        </span>
      ),
      // Matches the SQL ordering: date desc with createdAt as the tie-break.
      sortFn: (a, b) =>
        a.original.date.localeCompare(b.original.date) ||
        a.original.createdAt.localeCompare(b.original.createdAt),
    },
    {
      id: "note",
      accessorKey: "note",
      header: "Ghi chú",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="block truncate">{row.original.note || "—"}</span>
      ),
    },
    {
      id: "category",
      header: "Danh mục",
      accessorFn: (row) => row.categoryPathParts.join(" › ") || "",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          <CategoryPath row={row.original} />
        </span>
      ),
    },
    {
      id: "amount",
      accessorKey: "amount",
      header: "Số tiền",
      meta: { align: "right" as const },
      cell: ({ row }) => (
        <span className="block text-right font-medium">
          {formatVND(row.original.amount)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        handlers ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlers.onEdit(row.original)}
            >
              <Pencil />
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              }
              title="Xoá giao dịch"
              description="Bạn có chắc chắn muốn xoá giao dịch này?"
              onConfirm={() => handlers.onDelete(row.original.id)}
            />
          </div>
        ) : null,
    },
  ];
}
