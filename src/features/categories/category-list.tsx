import { useState } from "react";
import { ChevronRight, Pencil, Tags, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ResponsiveModal } from "@/components/responsive-modal";
import { CategoryForm } from "@/features/categories/category-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError } from "@/lib/toast";
import { deleteCategory } from "@/server/categories.actions";
import { buildCategoryTree, type CategoryNode } from "@/lib/category-tree";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/db/schema";

/** Indent per level. Small on purpose — see the note in CategoryRow. */
const INDENT = 16;

export function CategoryList({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: async (result) => {
      if (!result.success) {
        toastError(result.error);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["overview"] }),
        queryClient.invalidateQueries({ queryKey: ["recentCategories"] }),
      ]);
    },
  });

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (categories.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Tags />
          </EmptyMedia>
          <EmptyTitle>Chưa có danh mục</EmptyTitle>
          <EmptyDescription>
            Tạo danh mục đầu tiên để bắt đầu phân loại chi tiêu.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const renderNodes = (nodes: CategoryNode[], depth: number): React.ReactNode =>
    nodes.map((node) => {
      const isCollapsed = collapsed.has(node.id);
      const hasChildren = node.children.length > 0;
      return (
        <li key={node.id}>
          <CategoryRow
            node={node}
            depth={depth}
            collapsed={isCollapsed}
            onToggle={() => toggle(node.id)}
            onEdit={() => setEditing(node)}
            onDelete={() => remove.mutateAsync(node.id)}
          />
          {hasChildren && !isCollapsed && (
            <ul>{renderNodes(node.children, depth + 1)}</ul>
          )}
        </li>
      );
    });

  return (
    <>
      <ul className="space-y-1">
        {renderNodes(buildCategoryTree(categories), 0)}
      </ul>

      {/*
       * Editing opens a modal rather than replacing the row in place. Inline
       * editing swapped a one-line row for a two-row form, so the list jumped
       * and everything below it moved while you were reading it.
       */}
      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Sửa danh mục"
      >
        {editing && (
          <CategoryForm
            categories={categories}
            defaultValues={{
              id: editing.id,
              name: editing.name,
              parentId: editing.parentId,
            }}
            onSuccess={() => setEditing(null)}
          />
        )}
      </ResponsiveModal>
    </>
  );
}

function CategoryRow({
  node,
  depth,
  collapsed,
  onToggle,
  onEdit,
  onDelete,
}: {
  node: CategoryNode;
  depth: number;
  collapsed: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasChildren = node.children.length > 0;

  return (
    /*
     * Hierarchy is shown with a chevron and a guide line, not indentation alone.
     * The old list indented 24px per level with no other cue, so on a 358px
     * screen a fourth-level category had lost a third of its width and still
     * looked like a root if you could not see its parent. 16px plus a rule is
     * enough to read the nesting without spending the width.
     */
    <div
      className="flex min-h-12 items-center gap-1 rounded-lg border px-1"
      style={{ marginLeft: depth * INDENT }}
    >
      {hasChildren ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Mở ${node.name}` : `Thu gọn ${node.name}`}
        >
          <ChevronRight
            className={cn("transition-transform", !collapsed && "rotate-90")}
          />
        </Button>
      ) : (
        <span aria-hidden className="w-11 md:w-10" />
      )}

      <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>

      {hasChildren && collapsed && (
        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
          {node.children.length}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        aria-label={`Sửa ${node.name}`}
        onClick={onEdit}
      >
        <Pencil />
      </Button>

      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Xoá ${node.name}`}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
          </Button>
        }
        title="Xoá danh mục"
        description={
          hasChildren
            ? `Danh mục "${node.name}" đang có ${node.children.length} mục con. Xoá nó sẽ ảnh hưởng tới các mục bên trong.`
            : `Bạn có chắc chắn muốn xoá danh mục "${node.name}"?`
        }
        onConfirm={onDelete}
      />
    </div>
  );
}
