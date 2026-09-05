import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { CurrencyInput } from "@/components/currency-input";
import { DimensionChips } from "@/features/dimensions/dimension-chips";
import {
  FUNDING_SOURCE_COPY,
  PURPOSE_COPY,
} from "@/features/dimensions/dimension-copy";
import {
  createTransaction,
  updateTransaction,
} from "@/server/transactions.actions";
import { transactionSchema } from "@/lib/schemas";
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
 * for, then where it came from. Time collapses to a line of text because it is
 * "now" on almost every entry — as a full field it cost a slot and pushed the
 * save button down.
 *
 * The fast path is: type the amount, tap a chip, tap a chip, Save. Both
 * dimensions are chip rows — every option on screen, one tap each — the same
 * control as the filter rows, so the form reads the way the rest of the app
 * does. That also retires the separate "recent Purposes" quick-pick row this
 * form used to render above a select: with every Purpose already one tap
 * away, a second row of the same names was two places to look for one thing.
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
              // Not "what was it spent on?" — that is the Purpose question two
              // fields down, and asking it twice in a row, once for free text
              // and once for a choice, is exactly the kind of distinction
              // without a difference this whole change is removing.
              placeholder="Mua gì, ở đâu? (không bắt buộc)"
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
       *
       * Labelled with the question each answers rather than the noun, from
       * `dimension-copy.ts` so the form asks in exactly the words the filter
       * rows do. `required`: no "everything" chip, and nothing pressed until
       * the user answers, so an unanswered field looks unanswered.
       *
       * Chips, not selects: the person this is for said the select was hard
       * to use, and a chip row is plain in-flow buttons — no popup, no portal,
       * nothing for the drawer to fight with.
       */}
      <form.Field name="purposeId">
        {(field) => (
          <div className="space-y-2">
            <DimensionChips
              required
              options={purposes}
              value={field.state.value || null}
              onChange={(id) => field.handleChange(id ?? "")}
              copy={PURPOSE_COPY}
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
            <DimensionChips
              required
              options={fundingSources}
              value={field.state.value || null}
              onChange={(id) => field.handleChange(id ?? "")}
              copy={FUNDING_SOURCE_COPY}
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
