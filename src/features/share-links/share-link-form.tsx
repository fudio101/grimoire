"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { CategoryTreeSelect } from "@/features/share-links/category-tree-select";
import { createShareLink, updateShareLink } from "@/app/actions/share-links";
import { shareLinkSchema, type ShareLinkInput } from "@/lib/schemas";
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
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ShareLinkInput>({
    resolver: zodResolver(shareLinkSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      code: defaultValues?.code ?? "",
      categoryIds: defaultValues?.categoryIds ?? [],
    },
  });

  const onSubmit = async (data: ShareLinkInput) => {
    const result = defaultValues
      ? await updateShareLink(defaultValues.id, data)
      : await createShareLink(data);

    if (!result.success) {
      setError("root", { message: result.error });
      return;
    }

    if (!defaultValues) {
      reset({ name: "", code: "", categoryIds: [] });
    }
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 space-y-1">
          <Label className="text-muted-foreground text-xs">Tên link</Label>
          <Input placeholder="Tên link (tuỳ chọn)" {...register("name")} />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-muted-foreground text-xs">Mã link</Label>
          <Input placeholder="Để trống = tự tạo" {...register("code")} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">Danh mục</Label>
        <Controller
          name="categoryIds"
          control={control}
          render={({ field }) => (
            <CategoryTreeSelect
              categories={categories}
              value={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {errors.code && (
        <p className="text-destructive text-sm">{errors.code.message}</p>
      )}
      {errors.categoryIds && (
        <p className="text-destructive text-sm">{errors.categoryIds.message}</p>
      )}
      {errors.root && (
        <p className="text-destructive text-sm">{errors.root.message}</p>
      )}

      <SubmitButton isLoading={isSubmitting}>
        {defaultValues ? "Cập nhật" : "Tạo link"}
      </SubmitButton>
    </form>
  );
}
