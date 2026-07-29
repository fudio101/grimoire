import { useState } from "react";
import { Trash2, Pencil, ExternalLink, RefreshCw, Share2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ResponsiveModal } from "@/components/responsive-modal";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { toastError } from "@/lib/toast";
import { CopyButton } from "@/features/categories/copy-button";
import { ShareLinkForm } from "@/features/share-links/share-link-form";
import {
  toggleShareLinkEnabled,
  rotateShareLinkCode,
  deleteShareLink,
} from "@/server/share-links.functions";
import { shareLinksQueryOptions } from "@/lib/query-options";
import type { Category } from "@/lib/db/schema";
import type { ShareLinkWithCategories } from "@/lib/db/queries";

export function ShareLinkList({
  links,
  categories,
}: {
  links: ShareLinkWithCategories[];
  categories: Category[];
}) {
  const [editing, setEditing] = useState<ShareLinkWithCategories | null>(null);
  const queryClient = useQueryClient();
  const linksKey = shareLinksQueryOptions().queryKey;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["shareLinks"] });

  /**
   * Replaces useOptimistic + useTransition. Writing straight into the query
   * cache and rolling back on failure gives the same instant toggle, but keeps
   * the optimistic value and the cached value as one thing instead of two that
   * can disagree.
   */
  const toggle = useMutation({
    mutationFn: (id: string) => toggleShareLinkEnabled({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: linksKey });
      const previous =
        queryClient.getQueryData<ShareLinkWithCategories[]>(linksKey);
      queryClient.setQueryData<ShareLinkWithCategories[]>(linksKey, (current) =>
        current?.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(linksKey, ctx.previous);
    },
    onSettled: invalidate,
  });

  const rotate = useMutation({
    mutationFn: (id: string) => rotateShareLinkCode({ data: { id } }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteShareLink({ data: { id } }),
    onSuccess: async (result) => {
      if (!result.success) {
        toastError(result.error);
        return;
      }
      await invalidate();
    },
  });

  if (links.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Share2 />
          </EmptyMedia>
          <EmptyTitle>Chưa có link công khai</EmptyTitle>
          <EmptyDescription>
            Tạo link đầu tiên để chia sẻ báo cáo chi tiêu với người khác.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div key={link.id} className="rounded-lg border p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 font-medium break-words">
                  {link.name || link.code}
                </span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs break-all text-muted-foreground">
                  /p/{link.code}
                </code>
              </div>
              {link.categoryNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {link.categoryNames.map((name, i) => (
                    <Badge
                      key={`${link.id}-${i}`}
                      variant="secondary"
                      className="h-auto max-w-full text-xs break-words whitespace-normal"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:flex-nowrap sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(`/p/${link.code}`, "_blank")}
              >
                <ExternalLink />
              </Button>
              <CopyButton
                text={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${link.code}`}
              />

              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon">
                    <RefreshCw />
                  </Button>
                }
                title="Đổi mã link"
                description="Mã mới sẽ được tạo tự động. Link cũ sẽ không còn hoạt động. Bạn có chắc chắn?"
                confirmLabel="Đổi mã"
                // Rotating a code is not a deletion — it should not be styled
                // like one now that ConfirmDialog can say so.
                variant="default"
                onConfirm={() => rotate.mutate(link.id)}
              />

              <Switch
                checked={link.enabled}
                disabled={toggle.isPending}
                onCheckedChange={() => toggle.mutate(link.id)}
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(link)}
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
                title="Xoá link công khai"
                description={`Bạn có chắc chắn muốn xoá link "${link.name || link.code}"? Link sẽ ngừng hoạt động.`}
                onConfirm={() => remove.mutate(link.id)}
              />
            </div>
          </div>
        </div>
      ))}

      {/*
       * Same as the category list: editing opens a modal rather than replacing
       * the row, so the list does not reflow under the reader mid-edit.
       */}
      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Sửa link công khai"
      >
        {editing && (
          <ShareLinkForm
            categories={categories}
            defaultValues={{
              id: editing.id,
              name: editing.name,
              code: editing.code,
              categoryIds: editing.categoryIds,
            }}
            onSuccess={() => setEditing(null)}
          />
        )}
      </ResponsiveModal>
    </div>
  );
}
