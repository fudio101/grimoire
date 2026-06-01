import { getCategories, getShareLinks } from "@/lib/db/queries";
import { ShareLinkForm } from "@/features/share-links/share-link-form";
import { ShareLinkList } from "@/features/share-links/share-link-list";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const [categories, links] = await Promise.all([
    getCategories(),
    getShareLinks(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Link công khai</h1>
        <p className="text-muted-foreground text-sm">
          Tạo và quản lý link chia sẻ báo cáo cho nhiều danh mục.
        </p>
      </div>

      <ShareLinkForm categories={categories} />

      <ShareLinkList links={links} categories={categories} />
    </div>
  );
}
