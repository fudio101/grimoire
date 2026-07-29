import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/responsive-modal";
import { TransactionForm } from "@/features/transactions/transaction-form";
import type { Category } from "@/lib/db/schema";

/**
 * Two presentations of one thing: the inline button at the top of the
 * transactions page (desktop), and the floating circular button in the app
 * shell (mobile), which is reachable from any tab.
 */
export function AddTransactionButton({
  categories,
  appearance = "inline",
}: {
  categories: Category[];
  appearance?: "inline" | "floating";
}) {
  const [open, setOpen] = useState(false);

  const trigger =
    appearance === "floating" ? (
      <Button
        size="icon"
        aria-label="Thêm giao dịch"
        className="size-14 rounded-full shadow-lg"
      >
        <Plus className="size-6" />
      </Button>
    ) : (
      <Button>
        {/* No margin: Button already spaces its children with `gap-1.5`. */}
        <Plus />
        Thêm giao dịch
      </Button>
    );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      title="Thêm giao dịch"
      trigger={trigger}
    >
      <TransactionForm
        categories={categories}
        onSuccess={() => setOpen(false)}
      />
    </ResponsiveModal>
  );
}
