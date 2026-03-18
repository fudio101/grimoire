import { getCategories } from "@/lib/db/queries";
import { CategoryForm } from "@/features/categories/category-form";
import { CategoryList } from "@/features/categories/category-list";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Danh mục</h1>
        <p className="text-muted-foreground text-sm">
          Quản lý danh mục chi tiêu và chia sẻ công khai.
        </p>
      </div>

      <CategoryForm />

      <CategoryList categories={categories} />
    </div>
  );
}
