import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { CategoryPickerField } from "@/features/categories/category-picker";
import { createCategory, updateCategory } from "@/server/categories.functions";
import { categorySchema, type CategoryFormValues } from "@/lib/schemas";
import { getDescendantIds } from "@/lib/category-tree";
import type { Category } from "@/lib/db/schema";

export function CategoryForm({
  categories,
  defaultValues,
  onSuccess,
}: {
  categories: Category[];
  defaultValues?: { id: string; name: string; parentId: string | null };
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const initialValues: CategoryFormValues = {
    name: defaultValues?.name ?? "",
    parentId: defaultValues?.parentId ?? null,
  };

  const form = useForm({
    defaultValues: initialValues,
    validators: { onSubmit: categorySchema },
    onSubmit: async ({ value }) => {
      const result = defaultValues
        ? await updateCategory({ data: { id: defaultValues.id, data: value } })
        : await createCategory({ data: value });

      if (!result.success) {
        setServerError(result.error ?? null);
        return;
      }

      // Category names appear in the transaction table, so both caches go.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["overview"] }),
        queryClient.invalidateQueries({ queryKey: ["recentCategories"] }),
      ]);
      form.reset({ name: "", parentId: null });
      onSuccess?.();
    },
  });

  // Valid parent options: exclude the category itself and its descendants to
  // prevent cycles. (Server also rejects parents that already hold transactions.)
  const excluded = new Set(
    defaultValues
      ? [defaultValues.id, ...getDescendantIds(defaultValues.id, categories)]
      : []
  );

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        setServerError(null);
        void form.handleSubmit();
      }}
    >
      <div className="flex gap-2">
        <form.Field name="name">
          {(field) => (
            <Input
              name={field.name}
              placeholder="Tên danh mục"
              className="flex-1"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <SubmitButton isLoading={isSubmitting}>
              {defaultValues ? "Cập nhật" : "Thêm"}
            </SubmitButton>
          )}
        </form.Subscribe>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Danh mục cha</Label>
        <form.Field name="parentId">
          {(field) => (
            <CategoryPickerField
              categories={categories}
              value={field.state.value ?? null}
              onChange={(id) => field.handleChange(id)}
              // Any node can be a parent, not just leaves.
              selectable="all"
              excludeIds={excluded}
              clearLabel="— Cấp gốc —"
              placeholder="— Cấp gốc —"
              title="Chọn danh mục cha"
            />
          )}
        </form.Field>
      </div>

      <form.Field name="name">
        {(field) =>
          field.state.meta.errors[0] ? (
            <p className="text-sm text-destructive">
              {field.state.meta.errors[0].message}
            </p>
          ) : null
        }
      </form.Field>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
    </form>
  );
}
