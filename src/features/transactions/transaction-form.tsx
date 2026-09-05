import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { CurrencyInput } from "@/components/currency-input";
import { DimensionSelect } from "@/features/dimensions/dimension-select";
import {
  createTransaction,
  updateTransaction,
} from "@/server/transactions.actions";
import { transactionSchema } from "@/lib/schemas";
import { recentPurposesQueryOptions } from "@/lib/query-options";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { toastSuccess } from "@/lib/toast";
import type { FundingSource, Purpose } from "@/lib/db/schema";

function nowLocalString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

type TransactionFormProps = {
  purposes: Purpose[];
  fundingSources: FundingSource[];
  defaultValues?: {
    id: string;
    amount: number;
    note: string;
    date: string;
    purposeId: string;
    fundingSourceId: string;
  };
  onSuccess?: () => void;
};

/**
 * Ordered by what you know when you open this: the amount, then what it was
 * for, then where it came from. Time collapses to a line of text because it is "now" on almost every
 * entry — as a full field it cost a slot and pushed the save button down.
 *
 * The fast path is: type the amount, tap a chip, Save.
 */
export function TransactionForm({
  purposes,
  fundingSources,
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
    ...recentPurposesQueryOptions(),
    enabled: !isEdit,
  });

  const emptyValues = {
    amount: 0,
    note: "",
    date: nowLocalString(),
    purposeId: "",
    fundingSourceId: "",
  };

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] }),
      queryClient.invalidateQueries({ queryKey: ["recentPurposes"] }),
    ]);

  const form = useForm({
    defaultValues: {
      amount: defaultValues?.amount ?? 0,
      note: defaultValues?.note ?? "",
      date: defaultValues?.date?.slice(0, 16) ?? nowLocalString(),
      purposeId: defaultValues?.purposeId ?? "",
      fundingSourceId: defaultValues?.fundingSourceId ?? "",
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
        // Keep both dimensions and the time, clear what changes per entry,
        // and stay open.
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

  /**
   * Every Purpose is attachable now, so the chips no longer have to be
   * filtered down to the ones a transaction is *allowed* to sit on — the
   * leaf-only rule went with the hierarchy (ADR-0001).
   *
   * They are still intersected with `purposes`, for a different reason: the
   * two lists come from different caches. `recentPurposes` is refetched each
   * time this form mounts, while `purposes` was seeded once by the page's RSC
   * prefetch — so on a tab left open, a chip can name a Purpose the select
   * below has never heard of. Tapping it would set a value the select cannot
   * label, leaving a field that reads unselected while holding one.
   */
  const knownPurposeIds = new Set(purposes.map((p) => p.id));
  const recentPurposes = (recent ?? []).filter((p) =>
    knownPurposeIds.has(p.id)
  );

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

      {/*
       * Two independent choices, in the order they are usually known: what the
       * money went on, then which pot it came out of. Neither constrains the
       * other — that independence is the entire point of the model (ADR-0001).
       */}
      <form.Field name="purposeId">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="transaction-purpose">Mục đích chi</Label>

            {recentPurposes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recentPurposes.map((purpose) => {
                  const active = field.state.value === purpose.id;
                  return (
                    <Button
                      key={purpose.id}
                      type="button"
                      variant={active ? "default" : "outline"}
                      aria-pressed={active}
                      onClick={() =>
                        field.handleChange(active ? "" : purpose.id)
                      }
                    >
                      {purpose.name}
                    </Button>
                  );
                })}
              </div>
            )}

            <DimensionSelect
              id="transaction-purpose"
              options={purposes}
              value={field.state.value || null}
              onChange={(id) => field.handleChange(id ?? "")}
              placeholder="Chọn mục đích chi…"
            />

            {field.state.meta.errors[0] && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors[0].message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="fundingSourceId">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="transaction-funding-source">Nguồn tiền</Label>
            <DimensionSelect
              id="transaction-funding-source"
              options={fundingSources}
              value={field.state.value || null}
              onChange={(id) => field.handleChange(id ?? "")}
              placeholder="Chọn nguồn tiền…"
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
