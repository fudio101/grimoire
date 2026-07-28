import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CategoryForm } from "@/features/categories/category-form";
import { CategoryList } from "@/features/categories/category-list";
import { categoriesQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/dashboard/categories")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoriesQueryOptions()),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Danh mục</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý danh mục chi tiêu và chia sẻ công khai.
        </p>
      </div>

      <CategoryForm categories={categories} />

      <CategoryList categories={categories} />
    </div>
  );
}
