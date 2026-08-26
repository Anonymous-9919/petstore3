import { InventoryManager } from "@/components/admin/InventoryManager";
import { InventoryPanels } from "@/components/admin/InventoryPanels";
import { requireAdminPage } from "@/server/auth";
import { db } from "@/server/db";

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ stock?: string }> }) {
  await requireAdminPage("inventory");

  const [branches, categories] = await Promise.all([
    db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const { stock } = await searchParams;
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Operations</p><h1 className="mt-1 text-3xl font-bold">Inventory</h1><p className="mt-2 text-sm text-[#666]">Adjust branch stock with a signed reason and note. Reserved units cannot be reduced.</p></div><InventoryManager branches={branches} categories={categories} initialStock={stock} /><InventoryPanels branches={branches} categories={categories} /></>;
}
