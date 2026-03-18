"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
} from "@/app/actions/transactions";
import { transactionSchema, type TransactionInput } from "@/lib/schemas";
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
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: defaultValues?.amount ?? 0,
      note: defaultValues?.note ?? "",
      date: defaultValues?.date?.slice(0, 16) ?? nowLocalString(),
      categoryId: defaultValues?.categoryId ?? "",
    },
  });

  const onSubmit = async (data: TransactionInput) => {
    const result = defaultValues
      ? await updateTransaction(defaultValues.id, data)
      : await createTransaction(data);

    if (!result.success) {
      setError("root", { message: result.error });
      return;
    }

    reset({
      amount: 0,
      note: "",
      date: nowLocalString(),
      categoryId: "",
    });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Số tiền</Label>
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              id="amount"
              value={field.value}
              onChange={field.onChange}
              placeholder="0"
            />
          )}
        />
        {errors.amount && (
          <p className="text-destructive text-sm">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Ghi chú</Label>
        <Input
          id="note"
          type="text"
          placeholder="Chi tiêu cho gì?"
          {...register("note")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Thời gian</Label>
        <Input id="date" type="datetime-local" {...register("date")} />
        {errors.date && (
          <p className="text-destructive text-sm">{errors.date.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Danh mục</Label>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => field.onChange(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn danh mục">
                  {(value) => {
                    if (!value) return "Chọn danh mục";
                    const cat = categories.find((c) => c.id === value);
                    return cat?.name ?? "Chọn danh mục";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoryId && (
          <p className="text-destructive text-sm">
            {errors.categoryId.message}
          </p>
        )}
      </div>

      {errors.root && (
        <p className="text-destructive text-sm">{errors.root.message}</p>
      )}

      <SubmitButton className="w-full" isLoading={isSubmitting}>
        {defaultValues ? "Cập nhật" : "Thêm giao dịch"}
      </SubmitButton>
    </form>
  );
}
