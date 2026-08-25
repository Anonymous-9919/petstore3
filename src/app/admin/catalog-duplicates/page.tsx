import { DuplicateCatalogReview } from "@/components/admin/DuplicateCatalogReview";
import { requireAdminPage } from "@/server/auth";

export default async function AdminCatalogDuplicatesPage() {
  await requireAdminPage("catalog");
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Catalog</p><h1 className="mt-1 text-3xl font-bold">Duplicate review</h1><p className="mt-2 text-sm text-[#666]">Review likely duplicate canonical products before using the reversible archive action.</p></div><div className="mt-6"><DuplicateCatalogReview /></div></>;
}
