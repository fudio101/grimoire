import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { CategoryTreeSelect } from "@/features/share-links/category-tree-select";
import {
  createShareLink,
  updateShareLink,
} from "@/server/share-links.functions";
import { shareLinkSchema, type ShareLinkFormValues } from "@/lib/schemas";
import type { Category } from "@/lib/db/schema";

interface ShareLinkFormDefaults {
  id: string;
  name: string | null;
  code: string;
  categoryIds: string[];
}

export function ShareLinkForm({
  categories,
  defaultValues,
  onSuccess,
}: {
  categories: Category[];
  defaultValues?: ShareLinkFormDefaults;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const initialValues: ShareLinkFormValues = {
    name: defaultValues?.name ?? "",
    code: defaultValues?.code ?? "",
    categoryIds: defaultValues?.categoryIds ?? [],
  };

  const form = useForm({
    defaultValues: initialValues,
    validators: { onSubmit: shareLinkSchema },
    onSubmit: async ({ value }) => {
      const result = defaultValues
        ? await updateShareLink({ data: { id: defaultValues.id, data: value } })
        : await createShareLink({ data: value });

      if (!result.success) {
        setServerError(result.error ?? null);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["shareLinks"] });
      // Editing keeps the values on screen; only the create form clears.
      if (!defaultValues) {
        form.reset({ name: "", code: "", categoryIds: [] });
      }
      onSuccess?.();
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setServerError(null);
        void form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <form.Field name="name">
          {(field) => (
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Tên link</Label>
              <Input
                name={field.name}
                placeholder="Tên link (tuỳ chọn)"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="code">
          {(field) => (
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Mã link</Label>
              <Input
                name={field.name}
                placeholder="Để trống = tự tạo"
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
      </div>

      <form.Field name="categoryIds">
        {(field) => (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Danh mục</Label>
            <CategoryTreeSelect
              categories={categories}
              value={field.state.value}
              onChange={field.handleChange}
            />
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
          <SubmitButton isLoading={isSubmitting}>
            {defaultValues ? "Cập nhật" : "Tạo link"}
          </SubmitButton>
        )}
      </form.Subscribe>
    </form>
  );
}
