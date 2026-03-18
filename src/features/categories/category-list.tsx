"use client";

import { useState, useOptimistic, useTransition } from "react";
import {
  Trash2,
  Pencil,
  Link as LinkIcon,
  X,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CategoryForm } from "@/features/categories/category-form";
import { CopyButton } from "@/features/categories/copy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  toggleCategoryPublic,
  rotateShareToken,
  deleteCategory,
} from "@/app/actions/categories";
import type { Category } from "@/lib/db/schema";

export function CategoryList({ categories }: { categories: Category[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [optimisticCategories, addOptimistic] = useOptimistic(
    categories,
    (state: Category[], update: { id: string; isPublic: boolean }) =>
      state.map((c) =>
        c.id === update.id ? { ...c, isPublic: update.isPublic } : c
      )
  );
  const [, startTransition] = useTransition();

  const handleToggle = (category: Category) => {
    startTransition(async () => {
      addOptimistic({ id: category.id, isPublic: !category.isPublic });
      await toggleCategoryPublic(category.id);
    });
  };

  const handleDelete = async (id: string) => {
    const result = await deleteCategory(id);
    if (!result.success) {
      alert(result.error);
    }
  };

  if (optimisticCategories.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {optimisticCategories.map((category) => (
        <div
          key={category.id}
          className="flex items-center gap-3 rounded-lg border p-3"
        >
          {editingId === category.id ? (
            <div className="flex-1">
              <CategoryForm
                defaultValues={{ id: category.id, name: category.name }}
                onSuccess={() => setEditingId(null)}
              />
            </div>
          ) : (
            <>
              <span className="flex-1 font-medium">{category.name}</span>

              <div className="flex items-center gap-2">
                {category.isPublic && category.shareToken && (
                  <>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <LinkIcon className="h-3 w-3" />
                      Công khai
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        window.open(`/p/${category.shareToken}`, "_blank")
                      }
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <CopyButton
                      text={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${category.shareToken}`}
                    />
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      }
                      title="Đổi link công khai"
                      description="Link cũ sẽ không còn hoạt động. Bạn có chắc chắn?"
                      confirmLabel="Đổi link"
                      onConfirm={() => rotateShareToken(category.id)}
                    />
                  </>
                )}

                <Switch
                  checked={category.isPublic}
                  onCheckedChange={() => handleToggle(category)}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingId(category.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
              className="h-8 w-8"
              onClick={() => setEditingId(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
