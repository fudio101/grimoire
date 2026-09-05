import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/types";
import type {
  DimensionCopy,
  DimensionSchema,
} from "@/features/dimensions/dimension-copy";

/**
 * Create or rename one entry of either dimension.
 *
 * A name and nothing else. The parent picker is gone with the hierarchy
 * (ADR-0001), which is most of what this form used to be: choosing where a
 * category sat, and being told when that choice was illegal.
 *
 * Purposes and Funding Sources share this component but never share a screen.
 * Everything that differs between them arrives in `copy` and the two actions,
 * so the two dimensions cannot drift into behaving differently — while the
 * words on screen keep them plainly distinct.
 */
export function DimensionForm({
  copy,
  schema,
  create,
  update,
  defaultValues,
  onSuccess,
}: {
  copy: DimensionCopy;
  schema: DimensionSchema;
  create: (input: { name: string }) => Promise<ActionState>;
  update: (id: string, input: { name: string }) => Promise<ActionState>;
  defaultValues?: { id: string; name: string };
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: defaultValues?.name ?? "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const result = defaultValues
        ? await update(defaultValues.id, value)
        : await create(value);

      if (!result.success) {
        setServerError(result.error ?? null);
        return;
      }

      await invalidateDimension(queryClient, copy.queryKey);
      form.reset({ name: "" });
      onSuccess?.();
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setServerError(null);
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={field.name}>{copy.nameLabel}</Label>
            <Input
              id={field.name}
              name={field.name}
              placeholder={copy.namePlaceholder}
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

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <SubmitButton className="w-full" isLoading={isSubmitting}>
            {defaultValues ? "Cập nhật" : copy.createLabel}
          </SubmitButton>
        )}
      </form.Subscribe>
    </form>
  );
}

/**
 * Both dimensions' names render inside the transaction table and both roll up
 * into the overview, so renaming one has to clear more than its own list.
 * Exported so the list's delete path invalidates exactly the same set — the
 * two used to be written out separately and were a natural place to drift.
 */
export function invalidateDimension(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: string
): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [queryKey] }),
    queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    queryClient.invalidateQueries({ queryKey: ["overview"] }),
    queryClient.invalidateQueries({ queryKey: ["recentPurposes"] }),
  ]);
}
