import { PromotionManager } from "@/components/admin/PromotionManager";
import { requireAdminPage } from "@/server/auth";

export default async function AdminPromotionsPage() {
  await requireAdminPage("marketing");
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Marketing</p><h1 className="mt-1 text-3xl font-bold">Promotions</h1></div><div className="mt-6"><PromotionManager /></div></>;
}
