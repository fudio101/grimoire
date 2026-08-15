"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareLinkForm } from "@/features/share-links/share-link-form";
import { ShareLinkList } from "@/features/share-links/share-link-list";
import {
  categoriesQueryOptions,
  shareLinksQueryOptions,
} from "@/lib/query-options";

export function LinksView() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const { data: links } = useSuspenseQuery(shareLinksQueryOptions());

  return (
    // Deliberately the same shape as the categories tab: boxed create form
    // on top, titled list below, and no <h1> — the layout above already
    // owns it.
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo link mới</CardTitle>
        </CardHeader>
        <CardContent>
          <ShareLinkForm categories={categories} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold tracking-tight">
          Tất cả link
          {links.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {links.length}
            </span>
          )}
        </h2>
        <ShareLinkList links={links} categories={categories} />
      </section>
    </div>
  );
}
