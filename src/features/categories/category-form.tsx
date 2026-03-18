"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { createCategory, updateCategory } from "@/app/actions/categories";
import { categorySchema, type CategoryInput } from "@/lib/schemas";

export function CategoryForm({
  defaultValues,
  onSuccess,
}: {
  defaultValues?: { id: string; name: string };
  onSuccess?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
    },
  });

  const onSubmit = async (data: CategoryInput) => {
    const result = defaultValues
      ? await updateCategory(defaultValues.id, data)
      : await createCategory(data);

    if (!result.success) {
      setError("root", { message: result.error });
      return;
    }

    reset({ name: "" });
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
      {errors.name && (
        <p className="text-destructive text-sm">{errors.name.message}</p>
      )}
      {errors.root && (
        <p className="text-destructive text-sm">{errors.root.message}</p>
      )}
    </form>
  );
}
