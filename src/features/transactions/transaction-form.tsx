import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { CurrencyInput } from "@/components/currency-input";
import {
  createTransaction,
  updateTransaction,
} from "@/server/transactions.functions";
import { transactionSchema } from "@/lib/schemas";
import { getCategoryPath, isLeaf } from "@/lib/category-tree";
import type { Category } from "@/lib/db/schema";

function nowLocalString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

type TransactionFormProps = {
  categories: Category[];
  defaultValues?: {
    id: string;
    amount: number;
    note: string;
    date: string;
    categoryId: string;
  };
  onSuccess?: () => void;
};

export function TransactionForm({
  categories,
  defaultValues,
  onSuccess,
}: TransactionFormProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const emptyValues = {
    amount: 0,
    note: "",
    date: nowLocalString(),
    categoryId: "",
  };

  const form = useForm({
    defaultValues: {
      amount: defaultValues?.amount ?? 0,
      note: defaultValues?.note ?? "",
      date: defaultValues?.date?.slice(0, 16) ?? nowLocalString(),
      categoryId: defaultValues?.categoryId ?? "",
    },
    validators: { onSubmit: transactionSchema },
    onSubmit: async ({ value }) => {
      const result = defaultValues
        ? await updateTransaction({
            data: { id: defaultValues.id, data: value },
          })
        : await createTransaction({ data: value });

      if (!result.success) {
        setServerError(result.error ?? null);
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["overview"] }),
      ]);
      form.reset(emptyValues);
      onSuccess?.();
    },
  });

  // Transactions attach to leaf categories only; show the full path for context.
  const leafCategories = categories.filter((c) => isLeaf(c.id, categories));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setServerError(null);
        void form.handleSubmit();
      }}
    >
      <form.Field name="amount">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Số tiền</Label>
            <CurrencyInput
              id={field.name}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="0"
            />
            {field.state.meta.errors[0] && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors[0].message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="note">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Ghi chú</Label>
            <Input
              id={field.name}
              name={field.name}
              type="text"
              placeholder="Chi tiêu cho gì?"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="date">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Thời gian</Label>
            <Input
              id={field.name}
              name={field.name}
              type="datetime-local"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors[0] && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors[0].message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="categoryId">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Danh mục</Label>
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn danh mục">
                  {(value) => {
                    if (!value) return "Chọn danh mục";
                    return (
                      getCategoryPath(value, categories) || "Chọn danh mục"
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {leafCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {getCategoryPath(cat.id, categories)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.state.meta.errors[0] && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors[0].message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <SubmitButton className="w-full" isLoading={isSubmitting}>
            {defaultValues ? "Cập nhật" : "Thêm giao dịch"}
          </SubmitButton>
        )}
      </form.Subscribe>
    </form>
  );
}
