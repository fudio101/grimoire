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
import { createCategory, updateCategory } from "@/app/actions/categories";
import { categorySchema, type CategoryInput } from "@/lib/schemas";
import {
  flattenWithDepth,
  getDescendantIds,
  getCategoryPath,
} from "@/lib/category-tree";
import type { Category } from "@/lib/db/schema";

const ROOT_VALUE = "__root__";

export function CategoryForm({
  categories,
  defaultValues,
  onSuccess,
}: {
  categories: Category[];
  defaultValues?: { id: string; name: string; parentId: string | null };
  onSuccess?: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      parentId: defaultValues?.parentId ?? null,
    },
  });

  // Valid parent options: exclude the category itself and its descendants to
  // prevent cycles. (Server also rejects parents that already hold transactions.)
  const excluded = new Set(
    defaultValues
      ? [defaultValues.id, ...getDescendantIds(defaultValues.id, categories)]
      : []
  );
  const parentOptions = flattenWithDepth(categories).filter(
    ({ category }) => !excluded.has(category.id)
  );

  const onSubmit = async (data: CategoryInput) => {
    const result = defaultValues
      ? await updateCategory(defaultValues.id, data)
      : await createCategory(data);

    if (!result.success) {
      setError("root", { message: result.error });
      return;
    }

    reset({ name: "", parentId: null });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Tên danh mục"
          className="flex-1"
          {...register("name")}
        />
        <SubmitButton isLoading={isSubmitting}>
          {defaultValues ? "Cập nhật" : "Thêm"}
        </SubmitButton>
      </div>

      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">Danh mục cha</Label>
        <Controller
          name="parentId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ROOT_VALUE}
              onValueChange={(v) => field.onChange(v === ROOT_VALUE ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="— Cấp gốc —">
                  {(value) => {
                    if (!value || value === ROOT_VALUE) return "— Cấp gốc —";
                    return getCategoryPath(value, categories);
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_VALUE}>— Cấp gốc —</SelectItem>
                {parentOptions.map(({ category, depth }) => (
                  <SelectItem key={category.id} value={category.id}>
                    {" ".repeat(depth)}
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {errors.name && (
        <p className="text-destructive text-sm">{errors.name.message}</p>
      )}
      {errors.root && (
        <p className="text-destructive text-sm">{errors.root.message}</p>
      )}
    </form>
  );
}
