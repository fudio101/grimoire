"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Trash2, Pencil, X, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/features/categories/copy-button";
import { ShareLinkForm } from "@/features/share-links/share-link-form";
import {
  toggleShareLinkEnabled,
  rotateShareLinkCode,
  deleteShareLink,
} from "@/app/actions/share-links";
import type { Category } from "@/lib/db/schema";
import type { ShareLinkWithCategories } from "@/lib/db/queries";

export function ShareLinkList({
  links,
  categories,
}: {
  links: ShareLinkWithCategories[];
  categories: Category[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [optimisticLinks, setEnabled] = useOptimistic(
    links,
    (
      state: ShareLinkWithCategories[],
      update: { id: string; enabled: boolean }
    ) =>
      state.map((l) =>
        l.id === update.id ? { ...l, enabled: update.enabled } : l
      )
  );
  const [isPending, startTransition] = useTransition();

  const handleToggle = (link: ShareLinkWithCategories) => {
    startTransition(async () => {
      setEnabled({ id: link.id, enabled: !link.enabled });
      await toggleShareLinkEnabled(link.id);
    });
  };

  const handleDelete = async (id: string) => {
    const result = await deleteShareLink(id);
    if (!result.success) {
      alert(result.error);
    }
  };

  if (optimisticLinks.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Chưa có link công khai nào. Hãy tạo link đầu tiên!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {optimisticLinks.map((link) => (
        <div key={link.id} className="rounded-lg border p-3">
          {editingId === link.id ? (
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ShareLinkForm
                  categories={categories}
                  defaultValues={{
                    id: link.id,
                    name: link.name,
                    code: link.code,
                    categoryIds: link.categoryIds,
                  }}
                  onSuccess={() => setEditingId(null)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditingId(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
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
                  className="h-8 w-8"
                  onClick={() => window.open(`/p/${link.code}`, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <CopyButton
                  text={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${link.code}`}
                />

                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  }
                  title="Đổi mã link"
                  description="Mã mới sẽ được tạo tự động. Link cũ sẽ không còn hoạt động. Bạn có chắc chắn?"
                  confirmLabel="Đổi mã"
                  onConfirm={() => rotateShareLinkCode(link.id)}
                />

                <Switch
                  checked={link.enabled}
                  disabled={isPending}
                  onCheckedChange={() => handleToggle(link)}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingId(link.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  }
                  title="Xoá link công khai"
                  description={`Bạn có chắc chắn muốn xoá link "${link.name || link.code}"? Link sẽ ngừng hoạt động.`}
                  onConfirm={() => handleDelete(link.id)}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
