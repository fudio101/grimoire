"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryForm } from "@/features/categories/category-form";
import { CategoryList } from "@/features/categories/category-list";
import { categoriesQueryOptions } from "@/lib/query-options";

export function CategoriesView() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());

  return (
    <div className="space-y-6">
      {/*
       * The create form is boxed and titled so it reads as its own thing.
       * Left bare above the list it looked like a toolbar acting on the
       * list below — which is exactly how the parent picker got mistaken
       * for a filter.
       *
       * No <h1> here: the layout above already owns it, and the active tab
       * names this screen.
       */}
      <Card>
        <CardHeader>
          <CardTitle>Thêm danh mục mới</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm categories={categories} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold tracking-tight">
          Tất cả danh mục
          {categories.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {categories.length}
            </span>
          )}
        </h2>
        <CategoryList categories={categories} />
      </section>
    </div>
  );
}
