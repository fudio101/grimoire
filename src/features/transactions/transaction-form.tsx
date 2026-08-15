import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { CurrencyInput } from "@/components/currency-input";
import { CategoryPickerField } from "@/features/categories/category-picker";
import {
  createTransaction,
  updateTransaction,
} from "@/server/transactions.actions";
import { transactionSchema } from "@/lib/schemas";
import { isLeaf } from "@/lib/category-tree";
import { recentCategoriesQueryOptions } from "@/lib/query-options";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { toastSuccess } from "@/lib/toast";
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

/**
 * Ordered by what you know when you open this: the amount, then what it was
 * for. Time collapses to a line of text because it is "now" on almost every
 * entry — as a full field it cost a slot and pushed the save button down.
 *
 * The fast path is: type the amount, tap a chip, Save.
 */
export function TransactionForm({
  categories,
  defaultValues,
  onSuccess,
}: TransactionFormProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);
  const isEdit = Boolean(defaultValues);

  /**
   * A ref, not state: `onSubmit` is a closure created during render, so a state
   * value set immediately before calling submit() would still read as its
   * previous value inside that closure. The ref is read at call time.
   */
  const keepOpen = useRef(false);

  // Deliberately not a suspense query — the chips are an accelerator, and the
  // form has to be usable the instant it opens rather than waiting on them.
  const { data: recent } = useQuery({
    ...recentCategoriesQueryOptions(),
    enabled: !isEdit,
  });

  const emptyValues = {
    amount: 0,
    note: "",
    date: nowLocalString(),
    categoryId: "",
  };

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] }),
      queryClient.invalidateQueries({ queryKey: ["recentCategories"] }),
    ]);

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
        ? await updateTransaction(defaultValues.id, value)
        : await createTransaction(value);

      if (!result.success) {
        setServerError(result.error ?? null);
        return;
      }

      await invalidate();

      if (keepOpen.current) {
        // Keep category and time, clear what changes per entry, stay open.
        // Entering a run of receipts is one flow, not N.
        keepOpen.current = false;
        form.setFieldValue("amount", 0);
        form.setFieldValue("note", "");
        toastSuccess("Đã lưu", "Nhập tiếp khoản kế tiếp.");
        return;
      }

      form.reset(emptyValues);
      onSuccess?.();
    },
  });

  const submit = () => {
    setServerError(null);
    void form.handleSubmit();
  };

  // Transactions attach to leaves only, so a parent category that happens to be
  // used recently must not become a chip that produces an invalid entry.
  const recentLeafIds = (recent ?? [])
    .filter((c) => isLeaf(c.id, categories))
    .map((c) => c.id);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <form.Field name="amount">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Số tiền</Label>
            <CurrencyInput
              id={field.name}
              size="lg"
              autoFocus={!isEdit}
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

      <form.Field name="categoryId">
        {(field) => (
          <div className="space-y-2">
            <Label>Danh mục</Label>

            {recentLeafIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recentLeafIds.map((id) => {
                  const cat = categories.find((c) => c.id === id);
                  if (!cat) return null;
                  const active = field.state.value === id;
                  return (
                    <Button
                      key={id}
                      type="button"
                      variant={active ? "default" : "outline"}
                      aria-pressed={active}
                      onClick={() => field.handleChange(active ? "" : id)}
                    >
                      {cat.name}
                    </Button>
                  );
                })}
              </div>
            )}

            <CategoryPickerField
              categories={categories}
              value={field.state.value || null}
              onChange={(id) => field.handleChange(id ?? "")}
              selectable="leaf"
              recentIds={recentLeafIds}
              placeholder="Chọn danh mục khác…"
            />

            {field.state.meta.errors[0] && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors[0].message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="date">
        {(field) => (
          <div className="space-y-2">
            {showDate || isEdit ? (
              <>
                <Label htmlFor={field.name}>Thời gian</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="datetime-local"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowDate(true)}
                className="flex h-11 w-full items-center gap-2 rounded-md px-1 text-left text-sm text-muted-foreground hover:bg-accent"
              >
                <CalendarClock className="size-4 shrink-0" />
                <span>
                  {formatRelativeDay(field.state.value)},{" "}
                  {formatTime(field.state.value)}
                </span>
                <span className="ml-auto underline">Đổi</span>
              </button>
            )}
            {field.state.meta.errors[0] && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors[0].message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <div className="flex gap-2">
            <SubmitButton className="flex-1" isLoading={isSubmitting}>
              {isEdit ? "Cập nhật" : "Lưu"}
            </SubmitButton>
            {!isEdit && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => {
                  keepOpen.current = true;
                  submit();
                }}
              >
                Lưu &amp; nhập tiếp
              </Button>
            )}
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
