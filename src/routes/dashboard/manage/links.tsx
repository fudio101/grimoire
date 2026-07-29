import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ShareLinkForm } from "@/features/share-links/share-link-form";
import { ShareLinkList } from "@/features/share-links/share-link-list";
import {
  categoriesQueryOptions,
  shareLinksQueryOptions,
} from "@/lib/query-options";

export const Route = createFileRoute("/dashboard/manage/links")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(categoriesQueryOptions()),
      context.queryClient.ensureQueryData(shareLinksQueryOptions()),
    ]),
  component: LinksPage,
});

function LinksPage() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const { data: links } = useSuspenseQuery(shareLinksQueryOptions());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Link công khai</h1>
        <p className="text-sm text-muted-foreground">
          Tạo và quản lý link chia sẻ báo cáo cho nhiều danh mục.
        </p>
      </div>

      <ShareLinkForm categories={categories} />

      <ShareLinkList links={links} categories={categories} />
    </div>
  );
}
