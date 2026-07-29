import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ResponsiveModal } from "@/components/responsive-modal";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { TransactionDataTable } from "@/features/transactions/transaction-data-table";
import { transactionColumns } from "@/features/transactions/columns";
import { deleteTransaction } from "@/server/transactions.functions";
import { getCategoryPathParts } from "@/lib/category-tree";
import type { Category } from "@/lib/db/schema";
import type { TransactionRow, TransactionTableRow } from "@/lib/types";

export function TransactionTable({
  transactions,
  categories,
}: {
  transactions: TransactionRow[];
  categories: Category[];
}) {
  const [editingTx, setEditingTx] = useState<TransactionTableRow | null>(null);
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (id: string) => deleteTransaction({ data: { id } }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["overview"] }),
      ]),
  });

  // The dashboard owns the category list, so it resolves paths here with the
  // shared helper. This used to be a second, hand-written implementation of
  // getCategoryPathParts living in this file.
  const rows: TransactionTableRow[] = useMemo(
    () =>
      transactions.map((tx) => ({
        ...tx,
        categoryPathParts: getCategoryPathParts(tx.categoryId, categories),
      })),
    [transactions, categories]
  );

  // Both handlers are stable references — a useState setter and TanStack
  // Query's mutate — so the columns are built once.
  const columns = useMemo(
    () =>
      transactionColumns({
        onEdit: setEditingTx,
        onDelete: remove.mutate,
      }),
    [remove.mutate]
  );

  return (
    <>
      <TransactionDataTable
        data={rows}
        columns={columns}
        showActions
        emptyMessage="Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên!"
      />

      <ResponsiveModal
        open={editingTx !== null}
        onOpenChange={(open) => !open && setEditingTx(null)}
        title="Sửa giao dịch"
      >
        {editingTx && (
          <TransactionForm
            categories={categories}
            defaultValues={{
              id: editingTx.id,
              amount: editingTx.amount,
              note: editingTx.note,
              date: editingTx.date,
              categoryId: editingTx.categoryId,
            }}
            onSuccess={() => setEditingTx(null)}
          />
        )}
      </ResponsiveModal>
    </>
  );
}
