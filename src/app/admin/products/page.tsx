import { ProductCatalog } from "@/components/admin/ProductCatalog";
import { requireAdminPage } from "@/server/auth";
import { db } from "@/server/db";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  await requireAdminPage("catalog");
  const categories = await db.category.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, nameAr: true, archivedAt: true } });
  const clientCategories = categories.map((category) => ({ ...category, archivedAt: category.archivedAt?.toISOString() ?? null }));
  const { query } = await searchParams;
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Catalog</p><h1 className="mt-1 text-3xl font-bold">Products</h1></div><div className="mt-6"><ProductCatalog categories={clientCategories} initialQuery={query ?? ""} /></div></>;
}
