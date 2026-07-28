import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDateTime, formatVND } from "@/lib/format";
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
 * Shared by the dashboard and the public report. The public report simply hides
 * the `actions` column, which is what lets both use one definition instead of
 * two hand-written tables that drifted apart.
 */
export function transactionColumns(
  handlers?: ActionHandlers
): ColumnDef<TransactionTableRow>[] {
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
      sortingFn: (a, b) =>
        a.original.date.localeCompare(b.original.date) ||
        a.original.createdAt.localeCompare(b.original.createdAt),
    },
    // Note before category, matching the dashboard table this replaces. The
    // public report used the opposite order; sharing one definition means one
    // of the two had to move, and the daily-use screen keeps its layout.
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
              className="h-8 w-8"
              onClick={() => handlers.onEdit(row.original)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
