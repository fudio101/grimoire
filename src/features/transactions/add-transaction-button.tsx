"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/responsive-modal";
import { TransactionForm } from "@/features/transactions/transaction-form";
import type { Category } from "@/lib/db/schema";

export function AddTransactionButton({
  categories,
}: {
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      title="Thêm giao dịch"
      trigger={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Thêm giao dịch
        </Button>
      }
    >
      <TransactionForm
        categories={categories}
        onSuccess={() => setOpen(false)}
      />
    </ResponsiveModal>
  );
}
