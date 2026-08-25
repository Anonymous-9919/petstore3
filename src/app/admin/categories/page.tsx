import { CategoryCatalog } from "@/components/admin/CategoryCatalog";
import { requireAdminPage } from "@/server/auth";
import { db } from "@/server/db";

export default async function AdminCategoriesPage() {
  await requireAdminPage("catalog");
  const categories = await db.category.findMany({
    orderBy: [{ archivedAt: "asc" }, { sortOrder: "asc" }],
    select: { id: true, slug: true, name: true, nameAr: true, description: true, descriptionAr: true, imagePath: true, sortOrder: true, isActive: true, archivedAt: true, _count: { select: { products: true } } },
  });
  const initialCategories = categories.map((category) => ({ ...category, archivedAt: category.archivedAt?.toISOString() ?? null }));
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Catalog</p><h1 className="mt-1 text-3xl font-bold">Categories</h1></div><div className="mt-6"><CategoryCatalog initialCategories={initialCategories} /></div></>;
}
