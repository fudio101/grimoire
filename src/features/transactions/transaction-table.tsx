import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ResponsiveModal } from "@/components/responsive-modal";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { TransactionDataTable } from "@/features/transactions/transaction-data-table";
import { transactionColumns } from "@/features/transactions/columns";
import { deleteTransaction } from "@/server/transactions.actions";
import { toastError } from "@/lib/toast";
import type { FundingSource, Purpose } from "@/lib/db/schema";
import type { TransactionTableRow } from "@/lib/types";

export function TransactionTable({
  transactions,
  purposes,
  fundingSources,
}: {
  transactions: TransactionTableRow[];
  purposes: Purpose[];
  fundingSources: FundingSource[];
}) {
  const [editingTx, setEditingTx] = useState<TransactionTableRow | null>(null);
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: async (result) => {
      if (!result.success) {
        toastError(result.error);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["overview"] }),
      ]);
    },
    onError: () => {
      // See the note in dimension-list.tsx: a thrown Server Action arrives
      // redacted and in English, so it needs its own Vietnamese path.
      toastError("Không xoá được giao dịch. Vui lòng thử lại.");
    },
  });

  // Rows arrive render-ready: both dimensions' names travel with the row from
  // the query. This used to index the whole category list and walk an ancestor
  // chain per row just to build a breadcrumb.
  //
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
        data={transactions}
        columns={columns}
        onEdit={setEditingTx}
        onDelete={remove.mutate}
        emptyMessage="Hãy thêm khoản chi đầu tiên để bắt đầu theo dõi."
      />

      <ResponsiveModal
        open={editingTx !== null}
        onOpenChange={(open) => !open && setEditingTx(null)}
        title="Sửa giao dịch"
      >
        {editingTx && (
          <TransactionForm
            purposes={purposes}
            fundingSources={fundingSources}
            defaultValues={{
              id: editingTx.id,
              amount: editingTx.amount,
              note: editingTx.note,
              date: editingTx.date,
              purposeId: editingTx.purposeId,
              fundingSourceId: editingTx.fundingSourceId,
            }}
            onSuccess={() => setEditingTx(null)}
          />
        )}
      </ResponsiveModal>
    </>
  );
}
