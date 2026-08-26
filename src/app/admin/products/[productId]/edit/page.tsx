import Link from "next/link";
import { ProductCatalog } from "@/components/admin/ProductCatalog";
import { requireAdminPage } from "@/server/auth";
import { db } from "@/server/db";

export default async function ProductEditPage({ params }: { params: Promise<{ productId: string }> }) {
  await requireAdminPage("catalog");
  const [{ productId }, categories] = await Promise.all([
    params,
    db.category.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, nameAr: true, archivedAt: true } }),
  ]);
  return <><div className="flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Catalog</p><h1 className="mt-1 text-3xl font-bold">Edit product</h1></div><Link href="/admin/products" className="rounded border px-4 py-2 text-sm font-semibold">Back to products</Link></div><div className="mt-6"><ProductCatalog categories={categories.map((category) => ({ ...category, archivedAt: category.archivedAt?.toISOString() ?? null }))} editId={productId} /></div></>;
}
