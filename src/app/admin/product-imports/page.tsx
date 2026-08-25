import { ProductImportManager } from "@/components/admin/ProductImportManager";
import { requireAdminPage } from "@/server/auth";

export default async function ProductImportsPage() {
  await requireAdminPage("catalog");
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Catalog</p><h1 className="mt-1 text-3xl font-bold">Product imports</h1></div><div className="mt-6"><ProductImportManager /></div></>;
}
