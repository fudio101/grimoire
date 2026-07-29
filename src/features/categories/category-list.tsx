import { useState } from "react";
import { Trash2, Pencil, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/features/categories/category-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError } from "@/lib/toast";
import { deleteCategory } from "@/server/categories.functions";
import { flattenWithDepth } from "@/lib/category-tree";
import type { Category } from "@/lib/db/schema";

export function CategoryList({ categories }: { categories: Category[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }),
    onSuccess: async (result) => {
      if (!result.success) {
        toastError(result.error);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);
    },
  });

  const handleDelete = (id: string) => remove.mutate(id);

  if (categories.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {flattenWithDepth(categories).map(({ category, depth }) => (
        <div
          key={category.id}
          className="flex items-center gap-3 rounded-lg border p-3"
          style={{ marginLeft: depth * 24 }}
        >
          {editingId === category.id ? (
            <div className="flex-1">
              <CategoryForm
                categories={categories}
                defaultValues={{
                  id: category.id,
                  name: category.name,
                  parentId: category.parentId,
                }}
                onSuccess={() => setEditingId(null)}
              />
            </div>
          ) : (
            <>
              <span className="flex-1 font-medium">{category.name}</span>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingId(category.id)}
                >
                  <Pencil />
                </Button>

                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  }
                  title="Xoá danh mục"
                  description={`Bạn có chắc chắn muốn xoá danh mục "${category.name}"?`}
                  onConfirm={() => handleDelete(category.id)}
                />
              </div>
            </>
          )}

          {editingId === category.id && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingId(null)}
            >
              <X />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
